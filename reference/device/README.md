# Real-device screenshots (local only)

Screenshots from a real iPhone running Slack are the ground truth for everything Slack's source doesn't pin down:
the iOS 26 Liquid Glass chrome UIKit draws, margins, and whole-screen layouts that have no snapshot test. Put them
here; they're **gitignored** (they show a real workspace), so they never leave this machine.

Name them `<screen>-<light|dark>-<device>.png`, e.g. `home-light-iphone-17-pro.png`, and note the iOS version in
`devices.txt` (one line per device: `iphone-17-pro iOS 26.1`). Useful screens: Home (top and scrolled), DMs, Activity,
Search, More/You, a channel, a thread, a DM, an app DM's Home tab, message actions (long-press), the emoji picker,
the header menu, channel details, a profile, Later, Catch Up, a huddle.

iPhone screenshots are **Display P3**: read colors from the sRGB copies in `srgb/` (Chrome renders the clone in sRGB;
raw P3 values of saturated colors are off by up to ~35 per channel). Regenerate them after adding screenshots:

    python3 -c "import glob,io,os;from PIL import Image,ImageCms as C;d=C.createProfile('sRGB');os.makedirs('srgb',exist_ok=True)
    [C.profileToProfile(i.convert('RGB'),C.ImageCmsProfile(io.BytesIO(i.info['icc_profile'])),d,outputMode='RGB').save('srgb/'+os.path.basename(f)[:-4]+'.png') for f in glob.glob('*.PNG') for i in [Image.open(f)]]"

Compare a clone state with one at the same device size:

    npm run compare -- "/?chrome=screen&device=iphone-17-pro" reference/device/home-light-iphone-17-pro.png out.png

Content (names, messages) will differ from the demo; compare chrome, positions and sizes, or make a throwaway
prototype that copies the screenshot's content so the diff is like for like.
