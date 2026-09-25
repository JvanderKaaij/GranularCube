{
  "patcher": {
    "fileversion": 1,
    "appversion": { "major": 9, "minor": 1, "revision": 5, "architecture": "x64", "modernui": 1 },
    "classnamespace": "box",
    "rect": [ 120.0, 90.0, 1200.0, 780.0 ],
    "boxes": [
      { "box": { "id": "g1", "maxclass": "newobj", "text": "in 1", "patching_rect": [ 40.0, 35.0, 35.0, 22.0 ] } },
      { "box": { "id": "g2", "maxclass": "newobj", "text": "t l b", "patching_rect": [ 40.0, 75.0, 40.0, 22.0 ] } },
      { "box": { "id": "g3", "maxclass": "newobj", "text": "unpack 0 0. 0. 0. 0. 0.", "patching_rect": [ 40.0, 120.0, 180.0, 22.0 ] } },
      { "box": { "id": "g4", "maxclass": "newobj", "text": "t b b b", "patching_rect": [ 40.0, 165.0, 55.0, 22.0 ] } },

      { "box": { "id": "g5", "maxclass": "newobj", "text": "random 10000", "patching_rect": [ 40.0, 210.0, 90.0, 22.0 ] } },
      { "box": { "id": "g6", "maxclass": "newobj", "text": "scale 0 9999 -1. 1.", "patching_rect": [ 40.0, 245.0, 125.0, 22.0 ] } },
      { "box": { "id": "g7", "maxclass": "newobj", "text": "* 0.", "patching_rect": [ 40.0, 280.0, 40.0, 22.0 ] } },
      { "box": { "id": "g8", "maxclass": "newobj", "text": "+ 0.", "patching_rect": [ 40.0, 315.0, 40.0, 22.0 ] } },
      { "box": { "id": "g9", "maxclass": "newobj", "text": "clip 0. 1.", "patching_rect": [ 40.0, 350.0, 65.0, 22.0 ] } },

      { "box": { "id": "g10", "maxclass": "newobj", "text": "t f f", "patching_rect": [ 160.0, 390.0, 40.0, 22.0 ] } },
      { "box": { "id": "g11", "maxclass": "newobj", "text": "expr min(max(($f1*$f4)+($f2*$f3)\\,0.)\\,$f4)", "patching_rect": [ 210.0, 425.0, 275.0, 22.0 ] } },
      { "box": { "id": "g12", "maxclass": "newobj", "text": "expr $f1*$f2", "patching_rect": [ 160.0, 460.0, 85.0, 22.0 ] } },
      { "box": { "id": "g13", "maxclass": "newobj", "text": "pack 0. 0.", "patching_rect": [ 160.0, 495.0, 75.0, 22.0 ] } },
      { "box": { "id": "g14", "maxclass": "newobj", "text": "wave~ #1 0. 1000.", "patching_rect": [ 160.0, 565.0, 115.0, 22.0 ] } },

      { "box": { "id": "g20", "maxclass": "newobj", "text": "f 800.", "patching_rect": [ 300.0, 210.0, 50.0, 22.0 ] } },
      { "box": { "id": "g21", "maxclass": "message", "text": "0. 0 1. $1", "patching_rect": [ 300.0, 245.0, 75.0, 22.0 ] } },
      { "box": { "id": "g22", "maxclass": "newobj", "text": "line~", "patching_rect": [ 300.0, 280.0, 40.0, 22.0 ] } },

      { "box": { "id": "g23", "maxclass": "newobj", "text": "f 800.", "patching_rect": [ 405.0, 210.0, 50.0, 22.0 ] } },
      { "box": { "id": "g24", "maxclass": "newobj", "text": "expr max($f1-20.\\,0.)", "patching_rect": [ 405.0, 245.0, 135.0, 22.0 ] } },
      { "box": { "id": "g25", "maxclass": "message", "text": "0. 0 1. 10 1. $1 0. 10", "patching_rect": [ 405.0, 280.0, 145.0, 22.0 ] } },
      { "box": { "id": "g26", "maxclass": "newobj", "text": "line~", "patching_rect": [ 405.0, 315.0, 40.0, 22.0 ] } },

      { "box": { "id": "g31", "maxclass": "newobj", "text": "*~", "patching_rect": [ 330.0, 680.0, 32.0, 22.0 ] } },
      { "box": { "id": "g32", "maxclass": "newobj", "text": "out~ 1", "patching_rect": [ 285.0, 725.0, 48.0, 22.0 ] } },
      { "box": { "id": "g33", "maxclass": "newobj", "text": "out~ 2", "patching_rect": [ 375.0, 725.0, 48.0, 22.0 ] } },

      { "box": { "id": "g34", "maxclass": "message", "text": "mute 0, 1", "patching_rect": [ 880.0, 75.0, 65.0, 22.0 ] } },
      { "box": { "id": "g35", "maxclass": "message", "text": "mute 1, 0", "patching_rect": [ 880.0, 315.0, 65.0, 22.0 ] } },
      { "box": { "id": "g36", "maxclass": "newobj", "text": "thispoly~", "patching_rect": [ 880.0, 365.0, 65.0, 22.0 ] } },
      { "box": { "id": "g37", "maxclass": "newobj", "text": "loadbang", "patching_rect": [ 985.0, 280.0, 65.0, 22.0 ] } },
      { "box": { "id": "g38", "maxclass": "comment", "text": "Voice arg: #1 = local layer buffer", "patching_rect": [ 785.0, 35.0, 235.0, 20.0 ] } }
    ],
    "lines": [
      { "patchline": { "source": [ "g1", 0 ], "destination": [ "g2", 0 ] } },
      { "patchline": { "source": [ "g2", 1 ], "destination": [ "g34", 0 ] } },
      { "patchline": { "source": [ "g34", 0 ], "destination": [ "g36", 0 ] } },
      { "patchline": { "source": [ "g2", 0 ], "destination": [ "g3", 0 ] } },
      { "patchline": { "source": [ "g3", 0 ], "destination": [ "g4", 0 ] } },
      { "patchline": { "source": [ "g3", 1 ], "destination": [ "g20", 1 ] } },
      { "patchline": { "source": [ "g3", 1 ], "destination": [ "g23", 1 ] } },
      { "patchline": { "source": [ "g3", 1 ], "destination": [ "g11", 1 ] } },
      { "patchline": { "source": [ "g3", 2 ], "destination": [ "g8", 1 ] } },
      { "patchline": { "source": [ "g3", 3 ], "destination": [ "g7", 1 ] } },
      { "patchline": { "source": [ "g3", 4 ], "destination": [ "g11", 2 ] } },
      { "patchline": { "source": [ "g3", 5 ], "destination": [ "g11", 3 ] } },
      { "patchline": { "source": [ "g3", 5 ], "destination": [ "g12", 1 ] } },

      { "patchline": { "source": [ "g4", 2 ], "destination": [ "g5", 0 ] } },
      { "patchline": { "source": [ "g5", 0 ], "destination": [ "g6", 0 ] } },
      { "patchline": { "source": [ "g6", 0 ], "destination": [ "g7", 0 ] } },
      { "patchline": { "source": [ "g7", 0 ], "destination": [ "g8", 0 ] } },
      { "patchline": { "source": [ "g8", 0 ], "destination": [ "g9", 0 ] } },
      { "patchline": { "source": [ "g9", 0 ], "destination": [ "g10", 0 ] } },
      { "patchline": { "source": [ "g10", 1 ], "destination": [ "g11", 0 ] } },
      { "patchline": { "source": [ "g10", 0 ], "destination": [ "g12", 0 ] } },
      { "patchline": { "source": [ "g11", 0 ], "destination": [ "g13", 1 ] } },
      { "patchline": { "source": [ "g12", 0 ], "destination": [ "g13", 0 ] } },
      { "patchline": { "source": [ "g13", 0 ], "destination": [ "g14", 0 ] } },
      { "patchline": { "source": [ "g4", 1 ], "destination": [ "g20", 0 ] } },
      { "patchline": { "source": [ "g20", 0 ], "destination": [ "g21", 0 ] } },
      { "patchline": { "source": [ "g21", 0 ], "destination": [ "g22", 0 ] } },
      { "patchline": { "source": [ "g22", 0 ], "destination": [ "g14", 0 ] } },
      { "patchline": { "source": [ "g4", 0 ], "destination": [ "g23", 0 ] } },
      { "patchline": { "source": [ "g23", 0 ], "destination": [ "g24", 0 ] } },
      { "patchline": { "source": [ "g24", 0 ], "destination": [ "g25", 0 ] } },
      { "patchline": { "source": [ "g25", 0 ], "destination": [ "g26", 0 ] } },
      { "patchline": { "source": [ "g26", 1 ], "destination": [ "g35", 0 ] } },
      { "patchline": { "source": [ "g35", 0 ], "destination": [ "g36", 0 ] } },
      { "patchline": { "source": [ "g37", 0 ], "destination": [ "g35", 0 ] } },

      { "patchline": { "source": [ "g14", 0 ], "destination": [ "g31", 0 ] } },
      { "patchline": { "source": [ "g26", 0 ], "destination": [ "g31", 1 ] } },
      { "patchline": { "source": [ "g31", 0 ], "destination": [ "g32", 0 ] } },
      { "patchline": { "source": [ "g31", 0 ], "destination": [ "g33", 0 ] } }
    ],
    "autosave": 0
  }
}
