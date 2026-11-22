# Add a character palette

Choose one six-digit sRGB seed from the character art. Add the character and its position in the picker to [themes.ts](../src/themes.ts). Choose a hue that reads as the character even when the art is absent.

Add the portrait assets and register the character and launcher icon. [WidgetTheme.kt](../modules/anki-activity/android/src/main/java/expo/modules/ankiactivity/WidgetTheme.kt) · [Launcher themes plugin](../plugins/withLauncherThemes.js)

Run `bun run palettes:generate` and commit the generated palette with the character. The command supplies the light and dark app themes, review-history colors, and widget colors. The existing characters have approved palettes in [character-palette-overrides.json](../scripts/character-palette-overrides.json). Use an override when there is an approved design to preserve. The local check validates overrides and generated colors against the same requirements.

## How the generator works

Evil Martians' dynamic-theme work holds perceptual lightness steady while varying hue and controlling chroma. That lets the same role stay quiet or prominent across different themes. This app uses the approved 2B palette as the set of lightness levels. A new seed supplies hue and sets how much chroma to use, with a cap that keeps the surfaces muted. Color.js reduces chroma when a color falls outside sRGB and writes plain hex colors for Android. The library runs locally during generation and validation. [Dynamic themes with OKLCH](https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic) · [Color.js gamut mapping](https://colorjs.io/docs/gamut-mapping)

Harmonizer checks foreground and background as pairs because OKLCH lightness alone gives no contrast guarantee. This project uses WCAG contrast as the local pass criterion and OKLCH lightness to check the hierarchy. Study Pulse keeps the count above the values and icons, and the values above their labels. The app checks body text, muted text, accents, and button labels in both modes, plus the order of the review-history ramp. Validation covers the shipped palettes and generated seeds around the hue wheel. [Evil Martians Harmonizer](https://evilmartians.com/opensource/harmonizer) · [WCAG minimum contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

The contrast checks use opaque surfaces. At high widget transparency, the wallpaper also affects contrast. Review both moods using the [Android screenshot workflow](widget-screenshots.md) before publishing a character.
