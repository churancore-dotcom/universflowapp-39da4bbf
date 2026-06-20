---
name: Native Android DSP
description: All EQ/3D/8D/Reverb/BassBoost/LateNight/Speed effects on the APK run via android.media.audiofx attached to ExoPlayer's audio session, not Web Audio.
type: feature
---
On Android (APK), the WebView `<audio>` element is muted; ExoPlayer in `NativeAudioPlayerService` is the audible source. All DSP effects are applied natively via `android.media.audiofx` (`Equalizer`, `BassBoost`, `PresetReverb`, `Virtualizer`, `LoudnessEnhancer`) attached to an audio session ID we generate ourselves and call `player.setAudioSessionId(id)` with. Playback speed uses ExoPlayer `PlaybackParameters`. 8D Spatial is approximated with a `Handler` LFO sweeping Virtualizer strength + LARGEHALL reverb (Android audiofx has no stereo panner).

The 10-band web EQ is mapped onto the device's native bands (usually 5) by nearest-log-frequency; gain is converted dB→millibels and clamped to the device range.

`useGlobalAudioEngine` early-returns into native setters on `isNativeAndroid()` — it never builds the WebAudio graph on Android (would be silent + suspended in background).

Approximations / limits: 8D motion is strength-modulation, not true stereo rotation. Studio Spaces are mapped to closest PresetReverb (vinyl/studio→SMALLROOM, bedroom→MEDIUMROOM, hall→MEDIUMHALL, cathedral/stadium→LARGEHALL). Custom convolution IRs aren't possible with the built-in audiofx.
