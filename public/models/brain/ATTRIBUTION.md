# Brain anatomy attribution

brain-minimal.glb is a reduced anatomical surface subset of the Brain Project brain.glb:
https://github.com/itayinbarr/brainproject
https://github.com/itayinbarr/brainproject/blob/main/brain-atlas/models/brain.glb

Original anatomical geometry: Z-Anatomy contributors, based on BodyParts3D,
© The Database Center for Life Science (DBCLS).
https://www.z-anatomy.com/
https://lifesciencedb.jp/bp3d/

Licensed under Creative Commons Attribution-ShareAlike 4.0 International:
https://creativecommons.org/licenses/by-sa/4.0/

Mind Palace modifications (2026-09-17): retained cortex, cerebellum, pons,
midbrain and medulla; removed other structures, original materials and editor
metadata. The original retained surface geometry is unchanged. The app applies
pale materials, contour outlines and illustrative interaction highlights at runtime.
This derived model remains CC BY-SA 4.0. No endorsement is implied.

SOURCE-LICENSE.txt preserves the upstream license notices. The selected surfaces
are from Z-Anatomy / BodyParts3D; separately registered deep nuclei and tracts were
excluded. See scripts/prepare-brain-model.py for reproducible extraction.
