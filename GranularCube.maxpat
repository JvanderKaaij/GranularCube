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
        "rect": [ 34.0, 77.0, 2492.0, 1281.0 ],
        "boxes": [
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "obj-13",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 881.0, 763.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 600.0, 310.0, 110.0, 19.0 ],
                    "text": "FILTER FREQ MIN",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "obj-14",
                    "maxclass": "flonum",
                    "maximum": 20000.0,
                    "minimum": 1.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 883.0, 787.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 600.0, 332.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-15",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 883.0, 833.0, 119.0, 22.0 ],
                    "text": "prepend filterfreqmin"
                }
            },
            {
                "box": {
                    "id": "obj-16",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 883.0, 732.0, 83.0, 22.0 ],
                    "text": "loadmess 200"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "obj-17",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1010.0, 763.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 60.0, 395.0, 110.0, 19.0 ],
                    "text": "FILTER FREQ MAX",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "obj-18",
                    "maxclass": "flonum",
                    "maximum": 20000.0,
                    "minimum": 1.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1010.0, 787.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 60.0, 417.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-19",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1010.0, 833.0, 122.0, 22.0 ],
                    "text": "prepend filterfreqmax"
                }
            },
            {
                "box": {
                    "id": "obj-20",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1010.0, 732.0, 97.0, 22.0 ],
                    "text": "loadmess 20000"
                }
            },
            {
                "box": {
                    "autosave": 1,
                    "bgmode": 1,
                    "border": 0,
                    "clickthrough": 0,
                    "enablehscroll": 0,
                    "enablevscroll": 0,
                    "id": "obj-11",
                    "linecount": 2,
                    "lockeddragscroll": 0,
                    "lockedsize": 0,
                    "maxclass": "newobj",
                    "numinlets": 3,
                    "numoutlets": 4,
                    "offset": [ 0.0, 0.0 ],
                    "outlettype": [ "signal", "signal", "", "" ],
                    "patching_rect": [ 1506.0, 807.0, 403.0, 196.0 ],
                    "presentation_linecount": 2,
                    "saved_attribute_attributes": {
                        "valueof": {
                            "parameter_invisible": 1,
                            "parameter_longname": "amxd~",
                            "parameter_modmode": 0,
                            "parameter_shortname": "amxd~",
                            "parameter_type": 3
                        }
                    },
                    "saved_object_attributes": {
                        "parameter_enable": 1,
                        "patchername": "ChamberVerb.amxd",
                        "patchername_fallback": "Package:/Max for Live/patchers/Max Audio Effect/Chamberverb/ChamberVerb.amxd"
                    },
                    "snapshot": {
                        "filetype": "C74Snapshot",
                        "version": 2,
                        "minorversion": 0,
                        "name": "snapshotlist",
                        "origin": "max~",
                        "type": "list",
                        "subtype": "Undefined",
                        "embed": 1,
                        "snapshot": {
                            "name": "ChamberVerb.amxd",
                            "origname": "Package:/Max for Live/patchers/Max Audio Effect/Chamberverb/ChamberVerb.amxd",
                            "valuedictionary": {
                                "parameter_values": {
                                    "1_delay": 121.65354330708671,
                                    "1_feedback": 42.0,
                                    "2_delay": 154.55905511811028,
                                    "2_feedback": 56.0,
                                    "3_delay": 184.33070866141733,
                                    "3_feedback": 57.0,
                                    "45_delay": 134.18897637795286,
                                    "45_feedback": 60.0,
                                    "45_moddepth": 0.0,
                                    "45_modfreq": 0.0,
                                    "67_delay": 145.15748031496057,
                                    "67_feedback": 76.0,
                                    "filter_cutoff": 20000.0,
                                    "live.toggle": 0.0,
                                    "wet_dry": 60.0
                                }
                            },
                            "active": 1
                        },
                        "snapshotlist": {
                            "current_snapshot": 0,
                            "entries": [
                                {
                                    "filetype": "C74Snapshot",
                                    "version": 2,
                                    "minorversion": 0,
                                    "name": "ChamberVerb.amxd",
                                    "origin": "ChamberVerb.amxd",
                                    "type": "amxd",
                                    "subtype": "Undefined",
                                    "embed": 0,
                                    "snapshot": {
                                        "name": "ChamberVerb.amxd",
                                        "origname": "Package:/Max for Live/patchers/Max Audio Effect/Chamberverb/ChamberVerb.amxd",
                                        "valuedictionary": {
                                            "parameter_values": {
                                                "1_delay": 121.65354330708671,
                                                "1_feedback": 42.0,
                                                "2_delay": 154.55905511811028,
                                                "2_feedback": 56.0,
                                                "3_delay": 184.33070866141733,
                                                "3_feedback": 57.0,
                                                "45_delay": 134.18897637795286,
                                                "45_feedback": 60.0,
                                                "45_moddepth": 0.0,
                                                "45_modfreq": 0.0,
                                                "67_delay": 145.15748031496057,
                                                "67_feedback": 76.0,
                                                "filter_cutoff": 20000.0,
                                                "live.toggle": 0.0,
                                                "wet_dry": 60.0
                                            }
                                        },
                                        "active": 1
                                    },
                                    "fileref": {
                                        "name": "ChamberVerb.amxd",
                                        "filename": "ChamberVerb.amxd.maxsnap",
                                        "filepath": "~/Documents/Max 9/Snapshots",
                                        "filepos": -1,
                                        "snapshotfileid": "effe6029bec9c2815d836d6d74518472"
                                    }
                                }
                            ]
                        }
                    },
                    "text": "amxd~ \"Package:/Max for Live/patchers/Max Audio Effect/Chamberverb/ChamberVerb.amxd\"",
                    "varname": "amxd~",
                    "viewvisibility": 1
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "obj-2",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1185.0, 444.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 240.0, 310.0, 110.0, 19.0 ],
                    "text": "START MIN",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "obj-3",
                    "maxclass": "flonum",
                    "maximum": 10000.0,
                    "minimum": 1.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1185.0, 468.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 240.0, 332.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-4",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1185.0, 496.0, 95.0, 22.0 ],
                    "text": "prepend selstart"
                }
            },
            {
                "box": {
                    "id": "obj-5",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1185.0, 407.0, 90.0, 22.0 ],
                    "text": "loadmess 100"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "obj-6",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1305.0, 444.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 420.0, 310.0, 110.0, 19.0 ],
                    "text": "START MAX",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "obj-7",
                    "maxclass": "flonum",
                    "minimum": 1.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1305.0, 468.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 420.0, 332.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-8",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1415.0, 469.0, 26.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 530.0, 335.0, 70.0, 20.0 ],
                    "text": "ms",
                    "textcolor": [ 0.58, 0.63, 0.7, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "obj-9",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1305.0, 496.0, 91.0, 22.0 ],
                    "text": "prepend selend"
                }
            },
            {
                "box": {
                    "id": "obj-10",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1305.0, 407.0, 90.0, 22.0 ],
                    "text": "loadmess 200"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 24.0,
                    "id": "title",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 50.0, 30.0, 300.0, 34.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 35.0, 300.0, 34.0 ],
                    "text": "GranularCube",
                    "textcolor": [ 0.92, 0.94, 0.98, 1.0 ]
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "sample-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1138.0, 296.0, 180.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 110.0, 180.0, 19.0 ],
                    "text": "SAMPLE (project relative)",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "id": "sample",
                    "maxclass": "message",
                    "numinlets": 2,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 988.0, 320.0, 153.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 135.0, 330.0, 22.0 ],
                    "text": "sample Samples/violin.wav"
                }
            },
            {
                "box": {
                    "id": "sample-help",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1328.0, 321.0, 100.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 385.0, 138.0, 100.0, 20.0 ],
                    "text": "Click to reload",
                    "textcolor": [ 0.6, 0.65, 0.72, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "sample-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "bang" ],
                    "patching_rect": [ 988.0, 263.0, 60.0, 22.0 ],
                    "text": "loadbang"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "play-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1435.0, 228.0, 71.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 185.0, 90.0, 19.0 ],
                    "text": "PLAY / DSP",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "play-ui",
                    "maxclass": "toggle",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "int" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1440.0, 253.0, 42.0, 42.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 50.0, 210.0, 48.0, 48.0 ]
                }
            },
            {
                "box": {
                    "id": "play-msg",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1549.0, 331.0, 85.0, 22.0 ],
                    "text": "prepend play"
                }
            },
            {
                "box": {
                    "id": "dac",
                    "maxclass": "ezdac~",
                    "numinlets": 2,
                    "numoutlets": 0,
                    "patching_rect": [ 1506.0, 1048.0, 48.0, 45.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 120.0, 210.0, 48.0, 48.0 ]
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "density-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 725.0, 444.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 295.0, 110.0, 19.0 ],
                    "text": "DENSITY",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "density-ui",
                    "maxclass": "flonum",
                    "maximum": 100.0,
                    "minimum": 0.1,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 725.0, 468.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 317.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "density-unit",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 835.0, 469.0, 65.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 155.0, 320.0, 70.0, 20.0 ],
                    "text": "grains/sec",
                    "textcolor": [ 0.58, 0.63, 0.7, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "density-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 725.0, 496.0, 115.0, 22.0 ],
                    "text": "prepend density"
                }
            },
            {
                "box": {
                    "id": "density-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 725.0, 407.0, 90.0, 22.0 ],
                    "text": "loadmess 6"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "lengthmin-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 912.0, 444.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 225.0, 295.0, 110.0, 19.0 ],
                    "text": "LENGTH MIN",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "lengthmin-ui",
                    "maxclass": "flonum",
                    "maximum": 10000.0,
                    "minimum": 1.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 912.0, 468.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 225.0, 317.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "lengthmin-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 912.0, 496.0, 115.0, 22.0 ],
                    "text": "prepend lengthmin"
                }
            },
            {
                "box": {
                    "id": "lengthmin-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 912.0, 407.0, 90.0, 22.0 ],
                    "text": "loadmess 100"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "lengthmax-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1032.0, 444.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 405.0, 295.0, 110.0, 19.0 ],
                    "text": "LENGTH MAX",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "lengthmax-ui",
                    "maxclass": "flonum",
                    "minimum": 1.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1032.0, 468.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 405.0, 317.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "lengthmax-unit",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1142.0, 469.0, 29.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 515.0, 320.0, 70.0, 20.0 ],
                    "text": "ms",
                    "textcolor": [ 0.58, 0.63, 0.7, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "lengthmax-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1032.0, 496.0, 115.0, 22.0 ],
                    "text": "prepend lengthmax"
                }
            },
            {
                "box": {
                    "id": "lengthmax-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1032.0, 407.0, 90.0, 22.0 ],
                    "text": "loadmess 200"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "pitchmin-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 871.0, 587.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 585.0, 295.0, 110.0, 19.0 ],
                    "text": "PITCH MIN",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "pitchmin-ui",
                    "maxclass": "flonum",
                    "maximum": 8.0,
                    "minimum": 0.01,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 873.0, 611.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 585.0, 317.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "pitchmin-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 873.0, 657.0, 115.0, 22.0 ],
                    "text": "prepend pitchmin"
                }
            },
            {
                "box": {
                    "id": "pitchmin-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 873.0, 556.0, 90.0, 22.0 ],
                    "text": "loadmess 0.5"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "pitchmax-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1000.0, 587.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 380.0, 110.0, 19.0 ],
                    "text": "PITCH MAX",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "pitchmax-ui",
                    "maxclass": "flonum",
                    "maximum": 8.0,
                    "minimum": 0.01,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1000.0, 611.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 45.0, 402.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "pitchmax-unit",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1107.0, 611.0, 35.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 155.0, 405.0, 70.0, 20.0 ],
                    "text": "ratio",
                    "textcolor": [ 0.58, 0.63, 0.7, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "pitchmax-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1000.0, 657.0, 115.0, 22.0 ],
                    "text": "prepend pitchmax"
                }
            },
            {
                "box": {
                    "id": "pitchmax-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1000.0, 556.0, 90.0, 22.0 ],
                    "text": "loadmess 1"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "slope-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1157.0, 588.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 225.0, 380.0, 110.0, 19.0 ],
                    "text": "SLOPE",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "slope-ui",
                    "maxclass": "flonum",
                    "maximum": 1.0,
                    "minimum": 0.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1157.0, 612.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 225.0, 402.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "slope-unit",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1267.0, 613.0, 34.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 335.0, 405.0, 70.0, 20.0 ],
                    "text": "0–1",
                    "textcolor": [ 0.58, 0.63, 0.7, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "slope-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1157.0, 657.0, 115.0, 22.0 ],
                    "text": "prepend slope"
                }
            },
            {
                "box": {
                    "id": "slope-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1157.0, 557.0, 90.0, 22.0 ],
                    "text": "loadmess 0.5"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "gain-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1313.0, 588.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 405.0, 380.0, 110.0, 19.0 ],
                    "text": "OUTPUT",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ],
                    "textjustification": 2
                }
            },
            {
                "box": {
                    "format": 6,
                    "id": "gain-ui",
                    "maxclass": "flonum",
                    "maximum": 1.0,
                    "minimum": 0.0,
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "", "bang" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1313.0, 612.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 405.0, 402.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "gain-unit",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1423.0, 613.0, 32.0, 20.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 515.0, 405.0, 70.0, 20.0 ],
                    "text": "0–1",
                    "textcolor": [ 0.58, 0.63, 0.7, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "gain-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1313.0, 657.0, 115.0, 22.0 ],
                    "text": "prepend gain"
                }
            },
            {
                "box": {
                    "id": "gain-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1313.0, 557.0, 90.0, 22.0 ],
                    "text": "loadmess 0.2"
                }
            },
            {
                "box": {
                    "id": "layer",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 2,
                    "outlettype": [ "signal", "signal" ],
                    "patching_rect": [ 1549.0, 544.0, 100.0, 22.0 ],
                    "text": "granular_layer"
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "filtertype-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1437.0, 422.0, 110.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 585.0, 210.0, 110.0, 19.0 ],
                    "text": "FILTER TYPE",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ]
                }
            },
            {
                "box": {
                    "id": "filtertype-ui",
                    "items": [ "lowpass", ",", "highpass", ",", "bandpass", ",", "notch" ],
                    "maxclass": "umenu",
                    "numinlets": 1,
                    "numoutlets": 3,
                    "outlettype": [ "int", "", "" ],
                    "parameter_enable": 0,
                    "patching_rect": [ 1437.0, 444.0, 105.0, 22.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 585.0, 232.0, 105.0, 22.0 ]
                }
            },
            {
                "box": {
                    "id": "filtertype-prepend",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1437.0, 482.0, 115.0, 22.0 ],
                    "text": "prepend filtertype"
                }
            },
            {
                "box": {
                    "id": "filtertype-load",
                    "maxclass": "newobj",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "" ],
                    "patching_rect": [ 1437.0, 387.0, 90.0, 22.0 ],
                    "text": "loadmess 0"
                }
            },
            {
                "box": {
                    "id": "meter-l",
                    "maxclass": "meter~",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "float" ],
                    "patching_rect": [ 1578.0, 645.0, 18.0, 60.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 600.0, 392.0, 18.0, 58.0 ]
                }
            },
            {
                "box": {
                    "id": "meter-r",
                    "maxclass": "meter~",
                    "numinlets": 1,
                    "numoutlets": 1,
                    "outlettype": [ "float" ],
                    "patching_rect": [ 1600.0, 645.0, 18.0, 60.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 630.0, 392.0, 18.0, 58.0 ]
                }
            },
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "meter-label",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 1577.0, 712.0, 45.0, 19.0 ],
                    "presentation": 1,
                    "presentation_rect": [ 665.0, 408.0, 55.0, 19.0 ],
                    "text": "LEVEL",
                    "textcolor": [ 0.7, 0.76, 0.84, 1.0 ]
                }
            }
        ],
        "lines": [
            {
                "patchline": {
                    "destination": [ "density-ui", 0 ],
                    "source": [ "density-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 734.5, 531.75, 1558.5, 531.75 ],
                    "source": [ "density-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "density-prepend", 0 ],
                    "source": [ "density-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-ui", 0 ],
                    "source": [ "filtertype-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "source": [ "filtertype-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "filtertype-prepend", 0 ],
                    "source": [ "filtertype-ui", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "gain-ui", 0 ],
                    "source": [ "gain-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1322.5, 703.5, 1491.0, 703.5, 1491.0, 535.5, 1558.5, 535.5 ],
                    "source": [ "gain-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "gain-prepend", 0 ],
                    "source": [ "gain-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "meter-l", 0 ],
                    "midpoints": [ 1558.5, 605.5, 1587.5, 605.5 ],
                    "order": 0,
                    "source": [ "layer", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "meter-r", 0 ],
                    "midpoints": [ 1639.5, 605.5, 1609.5, 605.5 ],
                    "order": 1,
                    "source": [ "layer", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-11", 1 ],
                    "midpoints": [ 1639.5, 605.0, 1707.5, 605.0 ],
                    "order": 0,
                    "source": [ "layer", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-11", 0 ],
                    "midpoints": [ 1558.5, 602.0, 1515.5, 602.0 ],
                    "order": 1,
                    "source": [ "layer", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "lengthmax-ui", 0 ],
                    "source": [ "lengthmax-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1041.5, 531.75, 1558.5, 531.75 ],
                    "source": [ "lengthmax-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "lengthmax-prepend", 0 ],
                    "source": [ "lengthmax-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "lengthmin-ui", 0 ],
                    "source": [ "lengthmin-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 921.5, 531.75, 1558.5, 531.75 ],
                    "source": [ "lengthmin-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "lengthmin-prepend", 0 ],
                    "source": [ "lengthmin-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-7", 0 ],
                    "source": [ "obj-10", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "dac", 1 ],
                    "midpoints": [ 1643.5, 1032.0, 1544.5, 1032.0 ],
                    "source": [ "obj-11", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "dac", 0 ],
                    "midpoints": [ 1515.5, 1032.0, 1515.5, 1032.0 ],
                    "source": [ "obj-11", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-15", 0 ],
                    "source": [ "obj-14", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 892.5, 865.0, 1491.25, 865.0, 1491.25, 534.0, 1558.5, 534.0 ],
                    "source": [ "obj-15", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-14", 0 ],
                    "source": [ "obj-16", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-19", 0 ],
                    "source": [ "obj-18", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1019.5, 865.0, 1499.75, 865.0, 1499.75, 534.0, 1558.5, 534.0 ],
                    "source": [ "obj-19", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-18", 0 ],
                    "source": [ "obj-20", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-4", 0 ],
                    "source": [ "obj-3", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1194.5, 532.0, 1558.5, 532.0 ],
                    "source": [ "obj-4", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-3", 0 ],
                    "source": [ "obj-5", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-9", 0 ],
                    "source": [ "obj-7", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1314.5, 532.0, 1558.5, 532.0 ],
                    "source": [ "obj-9", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "pitchmax-ui", 0 ],
                    "source": [ "pitchmax-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1009.5, 702.5, 1468.0, 702.5, 1468.0, 535.5, 1558.5, 535.5 ],
                    "source": [ "pitchmax-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "pitchmax-prepend", 0 ],
                    "source": [ "pitchmax-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "pitchmin-ui", 0 ],
                    "source": [ "pitchmin-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 882.5, 703.5, 1457.0, 703.5, 1457.0, 535.5, 1558.5, 535.5 ],
                    "source": [ "pitchmin-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "pitchmin-prepend", 0 ],
                    "source": [ "pitchmin-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "source": [ "play-msg", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "play-msg", 0 ],
                    "midpoints": [ 1449.5, 315.0, 1558.5, 315.0 ],
                    "source": [ "play-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 997.5, 359.0, 1558.5, 359.0 ],
                    "source": [ "sample", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "sample", 0 ],
                    "source": [ "sample-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "slope-ui", 0 ],
                    "source": [ "slope-load", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 1166.5, 704.5, 1479.0, 704.5, 1479.0, 535.5, 1558.5, 535.5 ],
                    "source": [ "slope-prepend", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "slope-prepend", 0 ],
                    "source": [ "slope-ui", 0 ]
                }
            }
        ],
        "parameters": {
            "obj-11": [ "amxd~", "amxd~", 0 ],
            "parameterbanks": {
                "0": {
                    "index": 0,
                    "name": "",
                    "parameters": [ "-", "-", "-", "-", "-", "-", "-", "-" ],
                    "buttons": [ "-", "-", "-", "-", "-", "-", "-", "-" ]
                }
            },
            "inherited_shortname": 1
        },
        "autosave": 0
    }
}