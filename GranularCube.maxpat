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
        "rect": [ 830.0, 302.0, 1487.0, 908.0 ],
        "boxes": [
            {
                "box": {
                    "fontface": 1,
                    "fontsize": 11.0,
                    "id": "obj-13",
                    "maxclass": "comment",
                    "numinlets": 1,
                    "numoutlets": 0,
                    "patching_rect": [ 213.5, 651.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 215.5, 675.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 215.5, 721.0, 119.0, 22.0 ],
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
                    "patching_rect": [ 215.5, 620.0, 83.0, 22.0 ],
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
                    "patching_rect": [ 342.5, 651.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 342.5, 675.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 342.5, 721.0, 122.0, 22.0 ],
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
                    "patching_rect": [ 342.5, 620.0, 97.0, 22.0 ],
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
                    "patching_rect": [ 839.0, 695.0, 403.0, 196.0 ],
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
                                    "1_delay": 101.28346456692911,
                                    "1_feedback": 75.0,
                                    "2_delay": 99.716535433071,
                                    "2_feedback": 90.0,
                                    "3_delay": 79.04252068503943,
                                    "3_feedback": 90.0,
                                    "45_delay": 132.18582577165353,
                                    "45_feedback": 64.0,
                                    "45_moddepth": 1.574803149606302,
                                    "45_modfreq": 3.8976377952755885,
                                    "67_delay": 200.0,
                                    "67_feedback": 70.0,
                                    "filter_cutoff": 20000.0,
                                    "live.toggle": 0.0,
                                    "wet_dry": 26.0
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
                                                "1_delay": 101.28346456692911,
                                                "1_feedback": 75.0,
                                                "2_delay": 99.716535433071,
                                                "2_feedback": 90.0,
                                                "3_delay": 79.04252068503943,
                                                "3_feedback": 90.0,
                                                "45_delay": 132.18582577165353,
                                                "45_feedback": 64.0,
                                                "45_moddepth": 1.574803149606302,
                                                "45_modfreq": 3.8976377952755885,
                                                "67_delay": 200.0,
                                                "67_feedback": 70.0,
                                                "filter_cutoff": 20000.0,
                                                "live.toggle": 0.0,
                                                "wet_dry": 26.0
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
                    "patching_rect": [ 518.0, 332.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 518.0, 356.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 518.0, 384.0, 95.0, 22.0 ],
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
                    "patching_rect": [ 518.0, 295.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 638.0, 332.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 638.0, 356.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 748.0, 357.0, 26.0, 20.0 ],
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
                    "patching_rect": [ 638.0, 384.0, 91.0, 22.0 ],
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
                    "patching_rect": [ 638.0, 295.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 471.0, 184.0, 180.0, 19.0 ],
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
                    "patching_rect": [ 321.0, 208.0, 153.0, 22.0 ],
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
                    "patching_rect": [ 661.0, 209.0, 100.0, 20.0 ],
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
                    "patching_rect": [ 321.0, 151.0, 60.0, 22.0 ],
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
                    "patching_rect": [ 768.0, 116.0, 71.0, 19.0 ],
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
                    "patching_rect": [ 773.0, 141.0, 42.0, 42.0 ],
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
                    "patching_rect": [ 882.0, 219.0, 85.0, 22.0 ],
                    "text": "prepend play"
                }
            },
            {
                "box": {
                    "id": "dac",
                    "maxclass": "ezdac~",
                    "numinlets": 2,
                    "numoutlets": 0,
                    "patching_rect": [ 839.0, 936.0, 48.0, 45.0 ],
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
                    "patching_rect": [ 58.0, 332.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 58.0, 356.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 168.0, 357.0, 65.0, 20.0 ],
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
                    "patching_rect": [ 58.0, 384.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 58.0, 295.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 245.0, 332.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 245.0, 356.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 245.0, 384.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 245.0, 295.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 365.0, 332.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 365.0, 356.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 475.0, 357.0, 29.0, 20.0 ],
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
                    "patching_rect": [ 365.0, 384.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 365.0, 295.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 203.5, 475.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 205.5, 499.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 205.5, 545.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 205.5, 444.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 332.5, 475.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 332.5, 499.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 439.5, 499.0, 35.0, 20.0 ],
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
                    "patching_rect": [ 332.5, 545.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 332.5, 444.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 489.5, 476.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 489.5, 500.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 599.5, 501.0, 34.0, 20.0 ],
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
                    "patching_rect": [ 489.5, 545.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 489.5, 445.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 645.5, 476.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 645.5, 500.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 755.5, 501.0, 32.0, 20.0 ],
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
                    "patching_rect": [ 645.5, 545.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 645.5, 445.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 882.0, 432.0, 100.0, 22.0 ],
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
                    "patching_rect": [ 770.0, 310.0, 110.0, 19.0 ],
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
                    "patching_rect": [ 770.0, 332.0, 105.0, 22.0 ],
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
                    "patching_rect": [ 770.0, 370.0, 115.0, 22.0 ],
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
                    "patching_rect": [ 770.0, 275.0, 90.0, 22.0 ],
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
                    "patching_rect": [ 911.0, 533.0, 18.0, 60.0 ],
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
                    "patching_rect": [ 933.0, 533.0, 18.0, 60.0 ],
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
                    "patching_rect": [ 909.5, 599.5, 45.0, 19.0 ],
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
                    "midpoints": [ 67.5, 419.75, 891.5, 419.75 ],
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
                    "midpoints": [ 655.0, 591.5, 824.0, 591.5, 824.0, 423.5, 891.5, 423.5 ],
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
                    "midpoints": [ 891.5, 493.5, 920.5, 493.5 ],
                    "order": 0,
                    "source": [ "layer", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "meter-r", 0 ],
                    "midpoints": [ 972.5, 493.5, 942.5, 493.5 ],
                    "order": 1,
                    "source": [ "layer", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-11", 1 ],
                    "midpoints": [ 972.5, 493.0, 1040.5, 493.0 ],
                    "order": 0,
                    "source": [ "layer", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "obj-11", 0 ],
                    "midpoints": [ 891.5, 490.0, 848.5, 490.0 ],
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
                    "midpoints": [ 374.5, 419.75, 891.5, 419.75 ],
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
                    "midpoints": [ 254.5, 419.75, 891.5, 419.75 ],
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
                    "midpoints": [ 976.5, 920.0, 877.5, 920.0 ],
                    "source": [ "obj-11", 1 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "dac", 0 ],
                    "midpoints": [ 848.5, 920.0, 848.5, 920.0 ],
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
                    "midpoints": [ 225.0, 753.0, 824.25, 753.0, 824.25, 422.0, 891.5, 422.0 ],
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
                    "midpoints": [ 352.0, 753.0, 832.75, 753.0, 832.75, 422.0, 891.5, 422.0 ],
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
                    "midpoints": [ 527.5, 420.0, 891.5, 420.0 ],
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
                    "midpoints": [ 647.5, 420.0, 891.5, 420.0 ],
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
                    "midpoints": [ 342.0, 590.5, 801.0, 590.5, 801.0, 423.5, 891.5, 423.5 ],
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
                    "midpoints": [ 215.0, 591.5, 790.0, 591.5, 790.0, 423.5, 891.5, 423.5 ],
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
                    "midpoints": [ 782.5, 203.0, 891.5, 203.0 ],
                    "source": [ "play-ui", 0 ]
                }
            },
            {
                "patchline": {
                    "destination": [ "layer", 0 ],
                    "midpoints": [ 330.5, 247.0, 891.5, 247.0 ],
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
                    "midpoints": [ 499.0, 592.5, 812.0, 592.5, 812.0, 423.5, 891.5, 423.5 ],
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