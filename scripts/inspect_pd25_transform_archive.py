"""Read selected official PD25 ZIP entries using checked HTTP byte ranges.

Research downloads only, under work/. Never executes downloaded code or writes
application assets. ZIP CRC is checked; SHA256 records local download identity,
not a checksum independently published by the author.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import zlib

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://packages.bic.mni.mcgill.ca/mni-models/PD25/'
ARCHIVES = ('mni_PD25_20190708_minc2.zip', 'mni_PD25_Bigbrain_2019release_minc2.zip')


class RangeArchive:
    def __init__(self, name):
        if name not in ARCHIVES:
            raise ValueError('Unexpected official archive')
        self.url = BASE + name
        with urllib.request.urlopen(urllib.request.Request(self.url, method='HEAD'), timeout=30) as r:
            self.size = int(r.headers['Content-Length'])
            self.etag = r.headers['ETag']

    def read(self, start, length):
        if start < 0 or length <= 0 or start + length > self.size:
            raise ValueError('Invalid range')
        headers = {'Range': f'bytes={start}-{start+length-1}', 'If-Match': self.etag}
        with urllib.request.urlopen(urllib.request.Request(self.url, headers=headers), timeout=60) as r:
            if r.status != 206 or r.headers.get('Content-Range') != f'bytes {start}-{start+length-1}/{self.size}':
                raise ValueError('Server did not honor exact range')
            data = r.read(length+1)
        if len(data) != length:
            raise ValueError('Range length mismatch')
        return data

    def entries(self):
        tail = self.read(self.size-65557, 65557)
        offset = tail.rfind(b'PK\x05\x06')
        if offset < 0:
            raise ValueError('ZIP end record absent')
        _, disk, central_disk, count_disk, count, size, start, comment = struct.unpack_from('<4s4H2LH', tail, offset)
        if disk or central_disk or count_disk != count or start == 0xffffffff or count == 65535:
            raise ValueError('Unsupported multi-disk/ZIP64 archive')
        if offset + 22 + comment != len(tail):
            raise ValueError('Malformed ZIP end record')
        central = self.read(start, size)
        result = []
        cursor = 0
        for _ in range(count):
            fields = struct.unpack_from('<4s6H3L5H2L', central, cursor)
            if fields[0] != b'PK\x01\x02':
                raise ValueError('Invalid ZIP central entry')
            name_len, extra_len, comment_len = fields[10:13]
            name = central[cursor+46:cursor+46+name_len].decode('utf-8')
            result.append(dict(name=name, flags=fields[3], method=fields[4], crc32=fields[7], compressedSize=fields[8], size=fields[9], localOffset=fields[16]))
            cursor += 46 + name_len + extra_len + comment_len
        if cursor != len(central):
            raise ValueError('Unexpected central directory trailing bytes')
        return result

    def extract(self, entry):
        head = self.read(entry['localOffset'], 30)
        fields = struct.unpack('<4s5H3L2H', head)
        if fields[0] != b'PK\x03\x04' or fields[3] != entry['method'] or entry['flags'] & 1:
            raise ValueError('Unsupported or inconsistent ZIP entry')
        start = entry['localOffset']+30+fields[9]+fields[10]
        local_name = self.read(entry['localOffset']+30, fields[9]).decode('utf-8')
        if local_name != entry['name']:
            raise ValueError('ZIP names disagree')
        compressed = self.read(start, entry['compressedSize'])
        if entry['method'] == 8:
            data = zlib.decompress(compressed, -15)
        elif entry['method'] == 0:
            data = compressed
        else:
            raise ValueError('Unsupported compression')
        if len(data) != entry['size'] or zlib.crc32(data) != entry['crc32']:
            raise ValueError('ZIP size/CRC mismatch')
        return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', choices=ARCHIVES, default=ARCHIVES[0])
    parser.add_argument('--entry', action='append', default=[], help='Exact entry name from the index')
    args = parser.parse_args()
    archive = RangeArchive(args.archive)
    entries = archive.entries()
    out = ROOT/'work/official-bigbrain-tissue'/args.archive.removesuffix('.zip')
    out.mkdir(parents=True, exist_ok=True)
    index = dict(url=archive.url, bytes=archive.size, etag=archive.etag, entries=entries)
    (out/'archive-index.json').write_text(json.dumps(index, indent=2)+'\n', encoding='utf-8')
    for requested in args.entry:
        matches = [e for e in entries if e['name'] == requested]
        if len(matches) != 1:
            raise ValueError('Exact entry not found uniquely: '+requested)
        entry = matches[0]
        destination = out/Path(requested).name
        if destination.exists():
            raise ValueError('Refusing to overwrite previous download: '+str(destination))
        data = archive.extract(entry)
        destination.write_bytes(data)
        record = dict(archiveUrl=archive.url, archiveETag=archive.etag, entry=entry, sha256=hashlib.sha256(data).hexdigest())
        destination.with_suffix(destination.suffix+'.source.json').write_text(json.dumps(record, indent=2)+'\n', encoding='utf-8')
        print(json.dumps(record), flush=True)
    if not args.entry:
        print('\n'.join(e['name'] for e in entries))


if __name__ == '__main__':
    main()
