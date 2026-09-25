{
    "patcher": {
        "fileversion": 1,
        "appversion": {
            "major": 9,
            "minor": 1,
            "revision": 5,
            "architecture": "x64",
            "modernui": 1
        },
        "classnamespace": "box",
        "rect": [ 2595.0, 1021.0, 1010.0, 816.0 ],
        "boxes": [
            {
                "box": {
                    "id": "obj-1",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 891.0, 125.0, 81.0, 22.0 ],
                    "text": "s filterfreqmin"
                }
            },
            {
                "box": {
                    "id": "obj-2",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 891.0, 170.0, 84.0, 22.0 ],
                    "text": "s filterfreqmax"
                }
            },
            {
                "box": {
                    "id": "filtertype-select",
                    "maxclass": "newobj",
                    "numinlets": 5,
                    "numoutlets": 5,
                    "outlettype": [ "bang", "bang", "bang", "bang", "" ],
                    "patching_rect": [ 780.0, 75.0, 210.0, 22.0 ],
                    "text": "sel lowpass highpass bandpass notch"
                }
            },
            {
                "box": {
                    "id": "filtertype-lowpass",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 780.0, 110.0, 29.0, 22.0 ],
                    "text": "1"
                }
            },
            {
                "box": {
                    "id": "filtertype-highpass",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 825.0, 110.0, 29.0, 22.0 ],
                    "text": "2"
                }
            },
            {
                "box": {
                    "id": "filtertype-bandpass",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 870.0, 110.0, 29.0, 22.0 ],
                    "text": "3"
                }
            },
            {
                "box": {
                    "id": "filtertype-notch",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 915.0, 110.0, 29.0, 22.0 ],
                    "text": "4"
                }
            },
            {
                "box": {
                    "id": "filtertype-send",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 780.0, 150.0, 128.0, 22.0 ],
                    "text": "s #0-filtertypeindex"
                }
            },
            {
                "box": {
                    "comment": "sample/play/density/length/pitch/amplitude/selection/slope/gain messages",
                    "id": "in",
                    "index": 0,
                    "maxclass": "inlet",
                    "numinlets": 0,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 30.0, 30.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "route",
                    "maxclass": "newobj",
                    "numinlets": 17,
                    "numoutlets": 17,
                    "outlettype": [ "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "" ],
                    "patching_rect": [ 30.0, 75.0, 776.0, 22.0 ],
                    "text": "route sample play density lengthmin lengthmax pitchmin pitchmax ampmin ampmax selstart selend slope gain filterfreqmin filterfreqmax filtertype"
                }
            },
            {
                "box": {
                    "id": "replace",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 290.0, 100.0, 22.0 ],
                    "text": "prepend replace"
                }
            },
            {
                "box": {
                    "id": "buffer",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "float", "bang" ],
                    "patching_rect": [ 30.0, 330.0, 125.0, 22.0 ],
                    "text": "buffer~ #0-sample"
                }
            },
            {
                "box": {
                    "id": "info",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 10,
                    "outlettype": [ "float", "list", "float", "float", "float", "float", "float", "", "int", "" ],
                    "patching_rect": [ 30.0, 370.0, 110.0, 22.0 ],
                    "text": "info~ #0-sample"
                }
            },
            {
                "box": {
                    "id": "send-end",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 30.0, 410.0, 95.0, 22.0 ],
                    "text": "s selend"
                }
            },
            {
                "box": {
                    "id": "play",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "patching_rect": [ 210.0, 130.0, 40.0, 22.0 ],
                    "text": "!= 0"
                }
            },
            {
                "box": {
                    "id": "density-clip",
                    "maxclass": "newobj",
                    "numinlets": 3,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 290.0, 130.0, 95.0, 22.0 ],
                    "text": "clip 0.1 1000."
                }
            },
            {
                "box": {
                    "id": "interval",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 290.0, 170.0, 105.0, 22.0 ],
                    "text": "expr 1000. / $f1"
                }
            },
            {
                "box": {
                    "id": "metro",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 210.0, 215.0, 95.0, 22.0 ],
                    "text": "metro 166.667"
                }
            },
            {
                "box": {
                    "id": "trigger",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 210.0, 255.0, 105.0, 22.0 ],
                    "text": "midinote 60 100"
                }
            },
            {
                "box": {
                    "id": "poly",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "signal", "signal" ],
                    "patching_rect": [ 210.0, 300.0, 300.0, 22.0 ],
                    "text": "poly~ granular~.maxpat 64 @steal 1 @args #0"
                }
            },
            {
                "box": {
                    "id": "send-lengthmin",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 454.8, 125.0, 125.0, 22.0 ],
                    "text": "s lengthmin"
                }
            },
            {
                "box": {
                    "id": "send-lengthmax",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 604.8, 125.0, 125.0, 22.0 ],
                    "text": "s lengthmax"
                }
            },
            {
                "box": {
                    "id": "send-pitchmin",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 754.8, 125.0, 125.0, 22.0 ],
                    "text": "s pitchmin"
                }
            },
            {
                "box": {
                    "id": "send-pitchmax",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 454.8, 170.0, 125.0, 22.0 ],
                    "text": "s pitchmax"
                }
            },
            {
                "box": {
                    "id": "send-ampmin",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 604.8, 170.0, 125.0, 22.0 ],
                    "text": "s ampmin"
                }
            },
            {
                "box": {
                    "id": "send-ampmax",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 754.8, 170.0, 125.0, 22.0 ],
                    "text": "s ampmax"
                }
            },
            {
                "box": {
                    "id": "send-selstart",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 454.8, 215.0, 125.0, 22.0 ],
                    "text": "s selstart"
                }
            },
            {
                "box": {
                    "id": "send-selend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 604.8, 215.0, 125.0, 22.0 ],
                    "text": "s selend"
                }
            },
            {
                "box": {
                    "id": "send-slope",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 754.8, 215.0, 125.0, 22.0 ],
                    "text": "s slope"
                }
            },
            {
                "box": {
                    "id": "gain-clip",
                    "maxclass": "newobj",
                    "numinlets": 3,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 850.0, 300.0, 75.0, 22.0 ],
                    "text": "clip 0. 1."
                }
            },
            {
                "box": {
                    "id": "gain-ramp",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 850.0, 340.0, 80.0, 22.0 ],
                    "text": "pack 0. 20"
                }
            },
            {
                "box": {
                    "id": "gain-line",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "signal", "bang" ],
                    "patching_rect": [ 850.0, 380.0, 45.0, 22.0 ],
                    "text": "line~"
                }
            },
            {
                "box": {
                    "id": "left",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "signal" ],
                    "patching_rect": [ 210.0, 390.0, 35.0, 22.0 ],
                    "text": "*~"
                }
            },
            {
                "box": {
                    "id": "right",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "signal" ],
                    "patching_rect": [ 390.0, 390.0, 35.0, 22.0 ],
                    "text": "*~"
                }
            },
            {
                "box": {
                    "comment": "Left audio",
                    "id": "out-left",
                    "index": 0,
                    "maxclass": "outlet",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 210.0, 445.0, 30.0, 22.0 ]
                }
            },
            {
                "box": {
                    "comment": "Right audio",
                    "id": "out-right",
                    "index": 0,
                    "maxclass": "outlet",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 390.0, 445.0, 30.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 30.0, 330.0, 60.0, 22.0 ],
                    "text": "loadbang"
                }
            },
            {
                "box": {
                    "id": "defaults",
                    "linecount": 6,
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 479.0, 193.0, 91.0 ],
                    "text": "play 0, density 6., lengthmin 100., lengthmax 200., pitchmin 0.5, pitchmax 1., ampmin 0.5, ampmax 1., selstart 0., slope 0.5, filterfreqmin 200., filterfreqmax 20000., filtertype lowpass, gain 0.2"
                }
            },
            {
                "box": {
                    "id": "note",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 224.0, 514.5, 527.0, 20.0 ],
                    "text": "Relative samples resolve from the top-level patch path. One metro tick starts one granular~ voice."
                }
            },
            {
                "box": {
                    "id": "sample-trigger",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "patching_rect": [ 30.0, 125.0, 45.0, 22.0 ],
                    "text": "t s b"
                }
            },
            {
                "box": {
                    "id": "path-message",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 100.0, 125.0, 40.0, 22.0 ],
                    "text": "path"
                }
            },
            {
                "box": {
                    "id": "thispatcher",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 100.0, 165.0, 75.0, 22.0 ],
                    "save": [ "#N", "thispatcher", ";", "#Q", "end", ";" ],
                    "text": "thispatcher"
                }
            },
            {
                "box": {
                    "id": "path-combine",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 2,
                    "outlettype": [ "", "" ],
                    "patching_rect": [ 30.0, 210.0, 145.0, 22.0 ],
                    "text": "combine s / @triggers 1"
                }
            },
            {
                "box": {
                    "id": "absolute",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 30.0, 250.0, 85.0, 22.0 ],
                    "text": "absolutepath"
                }
            },
            {
                "box": {
                    "id": "sample-info-delay",
                    "maxclass": "newobj",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 30.0, 365.0, 65.0, 22.0 ],
                    "text": "delay 250"
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "replace", 0 ],
                    "source": [ "absolute", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "sample-info-delay", 0 ],
                    "source": [ "buffer", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "route", 0 ],
                    "source": [ "defaults", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "interval", 0 ],
                    "source": [ "density-clip", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-send", 0 ],
                    "source": [ "filtertype-bandpass", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-send", 0 ],
                    "source": [ "filtertype-highpass", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-send", 0 ],
                    "source": [ "filtertype-lowpass", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-send", 0 ],
                    "source": [ "filtertype-notch", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-bandpass", 0 ],
                    "source": [ "filtertype-select", 2 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-highpass", 0 ],
                    "source": [ "filtertype-select", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-lowpass", 0 ],
                    "source": [ "filtertype-select", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-notch", 0 ],
                    "source": [ "filtertype-select", 3 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "gain-ramp", 0 ],
                    "source": [ "gain-clip", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "left", 1 ],
                    "order": 1,
                    "source": [ "gain-line", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "right", 1 ],
                    "order": 0,
                    "source": [ "gain-line", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "gain-line", 0 ],
                    "source": [ "gain-ramp", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "route", 0 ],
                    "source": [ "in", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-end", 0 ],
                    "source": [ "info", 6 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "metro", 1 ],
                    "source": [ "interval", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "out-left", 0 ],
                    "source": [ "left", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "defaults", 0 ],
                    "source": [ "load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "trigger", 0 ],
                    "source": [ "metro", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "absolute", 0 ],
                    "source": [ "path-combine", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "thispatcher", 0 ],
                    "source": [ "path-message", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "metro", 0 ],
                    "source": [ "play", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "left", 0 ],
                    "source": [ "poly", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "right", 0 ],
                    "source": [ "poly", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "buffer", 0 ],
                    "source": [ "replace", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "out-right", 0 ],
                    "source": [ "right", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "density-clip", 0 ],
                    "source": [ "route", 2 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-select", 0 ],
                    "source": [ "route", 15 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "gain-clip", 0 ],
                    "source": [ "route", 12 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-1", 0 ],
                    "source": [ "route", 13 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-2", 0 ],
                    "source": [ "route", 14 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "play", 0 ],
                    "source": [ "route", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "sample-trigger", 0 ],
                    "source": [ "route", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-ampmax", 0 ],
                    "source": [ "route", 8 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-ampmin", 0 ],
                    "source": [ "route", 7 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-lengthmax", 0 ],
                    "source": [ "route", 4 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-lengthmin", 0 ],
                    "source": [ "route", 3 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-pitchmax", 0 ],
                    "source": [ "route", 6 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-pitchmin", 0 ],
                    "source": [ "route", 5 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-selend", 0 ],
                    "source": [ "route", 10 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-selstart", 0 ],
                    "source": [ "route", 9 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "send-slope", 0 ],
                    "source": [ "route", 11 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "info", 0 ],
                    "source": [ "sample-info-delay", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "path-combine", 1 ],
                    "source": [ "sample-trigger", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "path-message", 0 ],
                    "source": [ "sample-trigger", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "path-combine", 0 ],
                    "source": [ "thispatcher", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "poly", 0 ],
                    "source": [ "trigger", 0 ]
                }
            }
        ],
        "autosave": 0
    }
}