import {Config} from '@remotion/cli/config';

// WebGL en rendu headless : "angle" marche sur la plupart des machines.
// Si le rendu est noir ou plante, essaie "swangle" (CPU) ou "egl" (serveur GPU).
Config.setChromiumOpenGlRenderer((process.env.REMOTION_GL as 'angle' | 'swangle' | 'egl' | undefined) ?? 'angle');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
