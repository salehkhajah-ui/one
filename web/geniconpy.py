#!/usr/bin/env python3
"""Generate PORT app icons as small palette-indexed PNGs (no deps)."""
import struct, zlib, base64, os

PAL = [
    (0x0e,0x14,0x1a),  # 0 deep night frame
    (0x24,0x33,0x44),  # 1 dusk sky high
    (0x51,0x46,0x55),  # 2 dusk sky mid
    (0x9a,0x5f,0x52),  # 3 dusk sky low
    (0xd9,0xa4,0x3f),  # 4 gold (sun / container)
    (0x2e,0x6e,0x77),  # 5 sea
    (0x25,0x59,0x62),  # 6 sea shade
    (0x4a,0x50,0x55),  # 7 quay steel dark
    (0x4e,0x8c,0x87),  # 8 crane teal
    (0xf5,0xf1,0xe8),  # 9 ink light
]

def make(size):
    px = [[0]*size for _ in range(size)]
    s = size/512.0
    def rect(x,y,w,h,c):
        x0=int(round(x*s)); y0=int(round(y*s))
        x1=int(round((x+w)*s)); y1=int(round((y+h)*s))
        for yy in range(max(0,y0),min(size,y1)):
            row=px[yy]
            for xx in range(max(0,x0),min(size,x1)):
                row[xx]=c
    def disc(cx,cy,r,c):
        cx*=s; cy*=s; r*=s
        for yy in range(max(0,int(cy-r)),min(size,int(cy+r)+1)):
            dy=yy+0.5-cy
            import math
            dx=(r*r-dy*dy)
            if dx<0: continue
            dx=dx**0.5
            for xx in range(max(0,int(cx-dx)),min(size,int(cx+dx)+1)):
                px[yy][xx]=c

    # rounded-square background frame (deep night), inner art card
    rect(0,0,512,512,0)
    # dusk sky bands
    rect(40,40,432,150,1)
    rect(40,150,432,90,2)
    rect(40,240,432,64,3)
    # sun
    disc(412,254,48,4)
    # sea
    rect(40,304,432,120,5)
    rect(40,304,432,16,6)
    # quay
    rect(40,424,432,48,7)
    # crane: legs, cross rail, boom over the sea, cab
    rect(120,168,18,256,8)      # back leg
    rect(216,168,18,256,8)      # front leg
    rect(108,150,140,22,8)      # top beam
    rect(108,150,260,18,8)      # boom reaching over sea
    rect(150,196,54,36,8)       # cab
    # hoist cable + hanging gold container
    rect(306,168,6,88,9)
    rect(272,256,74,48,4)
    rect(272,276,74,6,3)        # container rib shadow
    # wordmark P O R T as simple studs on the quay
    for i,xx in enumerate((172,236,300,364)):
        rect(xx,438,26,20,9)
    return px

def png(px):
    size=len(px)
    raw=b''.join(b'\x00'+bytes(row) for row in px)
    def chunk(tag,data):
        c=struct.pack('>I',len(data))+tag+data
        return c+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    ihdr=struct.pack('>IIBBBBB',size,size,8,3,0,0,0)
    plte=b''.join(bytes(c) for c in PAL)
    return (b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',ihdr)+chunk(b'PLTE',plte)
            +chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

out=os.path.dirname(os.path.abspath(__file__))
for name,size in (('icon-192.png',192),('icon-512.png',512),('apple-touch-icon.png',180)):
    data=png(make(size))
    open(os.path.join(out,name),'wb').write(data)
    b64=base64.b64encode(data).decode()
    print(name,len(data),'bytes  b64',len(b64))
