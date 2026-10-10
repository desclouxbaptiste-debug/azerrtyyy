# Subtitle fonts

Fonts creators can pick for the burned-in subtitles (`server/styles.py`). They come unmodified from
Google Fonts (`fonts.gstatic.com`, static TTF instances) and are free to embed in videos and to redistribute
under the licences below. Every file covers French (accents, ligatures œ æ, ’ « » …).

| File | Font | Copyright holder | Licence |
| --- | --- | --- | --- |
| `montserrat.ttf` | Montserrat ExtraBold (800) | Copyright 2011 The Montserrat Project Authors (https://github.com/JulietaUla/Montserrat) | SIL Open Font License 1.1, see `OFL.txt` |
| `anton.ttf` | Anton Regular | Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git) | SIL Open Font License 1.1, see `OFL.txt` |
| `bebas.ttf` | Bebas Neue Regular | Copyright 2019 The Bebas Neue Project Authors (https://github.com/dharmatype/Bebas-Neue) | SIL Open Font License 1.1, see `OFL.txt` |
| `poppins.ttf` | Poppins Bold (700) | Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) | SIL Open Font License 1.1, see `OFL.txt` |
| `bangers.ttf` | Bangers Regular | Copyright 2010 The Bangers Project Authors (https://github.com/googlefonts/bangers) | SIL Open Font License 1.1, see `OFL.txt` |
| `luckiest.ttf` | Luckiest Guy Regular | Copyright (c) 2010 by Brian J. Bonislawsky DBA Astigmatic (AOETI). All rights reserved. | Apache License 2.0, see `Apache-2.0.txt` |
| `marker.ttf` | Permanent Marker Regular | Copyright (c) 2010 by Font Diner, Inc. All rights reserved. | Apache License 2.0, see `Apache-2.0.txt` |

The "Classique" choice is DejaVu Sans Bold, kept in `server/fonts/` with its own licence
(`server/fonts/LICENSE-DejaVu.txt`).

`OFL.txt` and `Apache-2.0.txt` are the full licence texts (from the `@fontsource/*` 5.3.0 npm packages, which
ship the same font projects); `OFL.txt` starts with the copyright notices of the five OFL fonts.

The ASS `Fontname` libass matches is each file's family name (name ID 1): "Montserrat ExtraBold" for
Montserrat (libass ignores the typographic family "Montserrat"), and the font name above without the weight
for the others.
