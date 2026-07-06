import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { AnimatedEmoji } from '@remotion/animated-emoji';
import { glow } from '@remotion/effects/glow';
import { noise as effectNoise } from '@remotion/effects/noise';
import { shine } from '@remotion/effects/shine';
import { vignette } from '@remotion/effects/vignette';
import { loadFont as loadInterFont } from '@remotion/google-fonts/Inter';
import { loadFont as loadRobotoMonoFont } from '@remotion/google-fonts/RobotoMono';
import { Lottie } from '@remotion/lottie';
import type { LottieAnimationData } from '@remotion/lottie';
import { Trail } from '@remotion/motion-blur';
import { noise2D } from '@remotion/noise';
import { Arrow, Star } from '@remotion/shapes';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import {
  AbsoluteFill,
  cancelRender,
  Composition,
  continueRender,
  delayRender,
  Easing,
  Img,
  interpolate,
  registerRoot,
  Solid,
  staticFile,
  useCurrentFrame,
} from 'remotion';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 60;
const TRANSITION_FRAMES = 18;
const SCENE_DURATIONS = [240, 554, 487, 270] as const;
// TransitionSeries overlaps adjacent scenes, so transition frames shorten the visible timeline.
const DURATION_IN_FRAMES =
  SCENE_DURATIONS.reduce((total, duration) => total + duration, 0) -
  TRANSITION_FRAMES * (SCENE_DURATIONS.length - 1);

const colors = {
  background: '#f6f8f6',
  border: '#d9e0dd',
  blue: '#2563eb',
  blueDark: '#1e3a8a',
  charcoal: '#17211f',
  green: '#12805c',
  greenDark: '#0f513d',
  muted: '#68756f',
  orange: '#d97706',
  panel: '#ffffff',
  softBlue: '#dbeafe',
  softGreen: '#dff5eb',
  softOrange: '#ffedd5',
};

const { fontFamily: interFontFamily } = loadInterFont('normal', {
  subsets: ['latin'],
  weights: ['400', '500', '600', '700', '800', '900'],
});
const { fontFamily: robotoMonoFontFamily } = loadRobotoMonoFont('normal', {
  subsets: ['latin'],
  weights: ['400', '500', '600', '700'],
});
const uiFontFamily = `${interFontFamily}, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
const codeFontFamily = `${robotoMonoFontFamily}, SFMono-Regular, Consolas, monospace`;
const researchPrompt = 'Compare USD/EUR rates from 3 sites.';

type Tone = 'blue' | 'green' | 'orange';
type NumberRange = readonly [number, number];

type HumanTypingConfig = {
  keyHold: NumberRange;
  mistypeChance: number;
  mistypeDelayCorrect: NumberRange;
  mistypeDelayNotice: NumberRange;
  shiftDownDelay: NumberRange;
  shiftUpDelay: NumberRange;
  typingDelay: number;
  typingDelaySpread: number;
  typingPauseChance: number;
  typingPauseRange: NumberRange;
};

type TypingStep = {
  frame: number;
  text: string;
};

type TraceActivity = {
  detail: string;
  label: 'Plan' | 'Result' | 'Tool';
  offset: number;
  tone?: Tone;
};

const humanTypingConfig = {
  keyHold: [10, 24],
  mistypeChance: 0.02,
  mistypeDelayCorrect: [45, 110],
  mistypeDelayNotice: [80, 190],
  shiftDownDelay: [18, 42],
  shiftUpDelay: [12, 30],
  typingDelay: 52,
  typingDelaySpread: 32,
  typingPauseChance: 0.09,
  typingPauseRange: [220, 520],
} satisfies HumanTypingConfig;

const nearbyKeys = {
  0: '9p',
  1: '2q',
  2: '13qw',
  3: '24we',
  4: '35er',
  5: '46rt',
  6: '57ty',
  7: '68yu',
  8: '79ui',
  9: '80io',
  a: 'sqwz',
  b: 'vghn',
  c: 'xdfv',
  d: 'sfecx',
  e: 'wrsdf',
  f: 'dgrtcv',
  g: 'fhtyb',
  h: 'gjybn',
  i: 'ujko',
  j: 'hkunm',
  k: 'jloi',
  l: 'kop',
  m: 'njk',
  n: 'bhjm',
  o: 'iklp',
  p: 'ol',
  q: 'wa',
  r: 'edft',
  s: 'awedxz',
  t: 'rfgy',
  u: 'yhji',
  v: 'cfgb',
  w: 'qase',
  x: 'zsdc',
  y: 'tghu',
  z: 'asx',
} satisfies Record<string, string>;

const shiftSymbols = new Set([
  '@',
  '#',
  '!',
  '$',
  '%',
  '^',
  '&',
  '*',
  '(',
  ')',
  '_',
  '+',
  ':',
  '"',
  '<',
  '>',
  '?',
  '~',
]);

const transitionTiming = linearTiming({ durationInFrames: TRANSITION_FRAMES });

const sceneTransitions = {
  capabilitiesToCta: (
    <TransitionSeries.Transition
      presentation={fade({ shouldFadeOutExitingScene: true })}
      timing={transitionTiming}
    />
  ),
  introToResearch: (
    <TransitionSeries.Transition
      presentation={slide({ direction: 'from-right' })}
      timing={transitionTiming}
    />
  ),
  researchToCapabilities: (
    <TransitionSeries.Transition
      presentation={wipe({ direction: 'from-bottom-right' })}
      timing={transitionTiming}
    />
  ),
};

const clamp = (value: number, input: [number, number], output: [number, number]): number =>
  interpolate(value, input, output, {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const enterStyle = (frame: number, delay = 0): CSSProperties => ({
  opacity: clamp(frame, [delay, delay + 16], [0, 1]),
  translate: `0 ${clamp(frame, [delay, delay + 20], [28, 0])}px`,
});

const scaleInStyle = (frame: number, delay = 0): CSSProperties => ({
  opacity: clamp(frame, [delay, delay + 14], [0, 1]),
  scale: clamp(frame, [delay, delay + 18], [0.96, 1]),
});

const cardStyle = (extra?: CSSProperties): CSSProperties => ({
  backgroundColor: colors.panel,
  border: `2px solid ${colors.border}`,
  borderRadius: 24,
  boxShadow: '0 22px 70px rgb(23 33 31 / 0.12)',
  ...extra,
});

const msToFrames = (ms: number): number => Math.max(1, Math.round((ms / 1000) * FPS));

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const randomRange = (random: () => number, range: NumberRange): number =>
  range[0] + random() * (range[1] - range[0]);

const isAscii = (character: string): boolean => {
  const codePoint = character.codePointAt(0);
  return codePoint !== undefined && codePoint < 128;
};

const isUpperCase = (character: string): boolean =>
  character.length === 1 && character >= 'A' && character <= 'Z';

const isAlphaNumeric = (character: string): boolean => /^[a-zA-Z0-9]$/.test(character);

const getNearbyKey = (character: string, random: () => number): string => {
  const lower = character.toLowerCase();
  const neighbors = nearbyKeys[lower as keyof typeof nearbyKeys];
  if (!neighbors) return character;

  const wrong = neighbors[Math.floor(random() * neighbors.length)] ?? character;
  return isUpperCase(character) ? wrong.toUpperCase() : wrong;
};

const keyActionDelay = (character: string, config: HumanTypingConfig, random: () => number): number => {
  if (!isAscii(character)) return randomRange(random, config.keyHold);
  if (isUpperCase(character) || shiftSymbols.has(character)) {
    return (
      randomRange(random, config.shiftDownDelay) +
      randomRange(random, config.keyHold) +
      randomRange(random, config.shiftUpDelay)
    );
  }

  return randomRange(random, config.keyHold);
};

const interCharacterDelay = (config: HumanTypingConfig, random: () => number): number => {
  if (random() < config.typingPauseChance) return randomRange(random, config.typingPauseRange);

  const delay = config.typingDelay + (random() - 0.5) * 2 * config.typingDelaySpread;
  return Math.max(10, delay);
};

const pushTypingStep = (steps: TypingStep[], elapsedMs: number, text: string): void => {
  const frame = msToFrames(elapsedMs);
  const lastStep = steps[steps.length - 1];

  if (lastStep?.frame === frame) {
    lastStep.text = text;
    return;
  }

  steps.push({ frame, text });
};

function createHumanizedTypingSteps(text: string, seed: number, config: HumanTypingConfig): TypingStep[] {
  const random = createSeededRandom(seed);
  const characters = [...text];
  const steps: TypingStep[] = [{ frame: 0, text: '' }];
  let elapsedMs = 0;
  let visibleText = '';

  for (const [index, character] of characters.entries()) {
    if (random() < config.mistypeChance && isAlphaNumeric(character)) {
      const wrongCharacter = getNearbyKey(character, random);
      elapsedMs += randomRange(random, config.keyHold);
      pushTypingStep(steps, elapsedMs, `${visibleText}${wrongCharacter}`);
      elapsedMs += randomRange(random, config.mistypeDelayNotice);
      pushTypingStep(steps, elapsedMs, visibleText);
      elapsedMs += randomRange(random, config.mistypeDelayCorrect);
    }

    elapsedMs += keyActionDelay(character, config, random);
    visibleText += character;
    pushTypingStep(steps, elapsedMs, visibleText);

    if (index < characters.length - 1) elapsedMs += interCharacterDelay(config, random);
  }

  return steps;
}

const researchTypingSteps = createHumanizedTypingSteps(researchPrompt, 1337, humanTypingConfig);

const traceActivities = [
  { detail: 'Pick FX sites', label: 'Plan', offset: 0 },
  { detail: 'browser_navigate', label: 'Tool', offset: 34, tone: 'blue' },
  { detail: 'Rates captured', label: 'Result', offset: 68, tone: 'orange' },
  { detail: 'Compare quotes', label: 'Plan', offset: 102 },
  { detail: 'browser_snapshot', label: 'Tool', offset: 136, tone: 'blue' },
  { detail: 'Table ready', label: 'Result', offset: 170, tone: 'orange' },
] satisfies TraceActivity[];

const TRACE_VISIBLE_ROWS = 3;
const TRACE_ROW_ADVANCE = 94;
const TRACE_VIEWPORT_HEIGHT = 334;
const TRACE_SCROLL_START_OFFSET = 64;
const TRACE_SCROLL_END_OFFSET = 206;
const TRACE_SCROLL_TRACK_HEIGHT = 302;
const TRACE_SCROLL_THUMB_HEIGHT = 96;
const textureDots = Array.from({ length: 34 }, (_, index) => {
  const x = (noise2D('texture-x', index * 0.37, 0.14) + 1) / 2;
  const y = (noise2D('texture-y', 0.22, index * 0.41) + 1) / 2;
  const size = 3 + ((noise2D('texture-size', index * 0.19, 0.72) + 1) / 2) * 8;

  return {
    left: `${x * 100}%`,
    opacity: 0.07 + ((noise2D('texture-opacity', index * 0.31, 0.95) + 1) / 2) * 0.11,
    size,
    top: `${y * 100}%`,
  };
});

const typedTextAtFrame = (steps: readonly TypingStep[], frame: number): string => {
  let text = '';

  for (const step of steps) {
    if (step.frame > frame) return text;
    text = step.text;
  }

  return text;
};

const finalTypingFrame = (steps: readonly TypingStep[]): number => steps[steps.length - 1]?.frame ?? 0;

const SceneEffects = () => {
  const frame = useCurrentFrame();
  const shineProgress = clamp(frame, [0, 210], [0, 1]);

  return (
    <>
      <Solid
        color={colors.background}
        effects={[
          effectNoise({ amount: 0.032, seed: 17 }),
          vignette({ amount: 0.1, color: '#dce6e1', feather: 0.52, radius: 0.72 }),
          shine({
            angle: 18,
            coreIntensity: 0.04,
            coreSigma: 82,
            haloIntensity: 0.045,
            haloSigma: 240,
            progress: shineProgress,
          }),
        ]}
        height={HEIGHT}
        style={{
          inset: 0,
          opacity: 0.72,
          position: 'absolute',
        }}
        width={WIDTH}
      />
      <div
        style={{
          inset: 0,
          opacity: 0.72,
          position: 'absolute',
        }}
      >
        {textureDots.map((dot, index) => (
          <div
            key={`${dot.left}-${dot.top}`}
            style={{
              backgroundColor: index % 3 === 0 ? colors.blue : index % 3 === 1 ? colors.green : colors.orange,
              borderRadius: 999,
              height: dot.size,
              left: dot.left,
              opacity: dot.opacity,
              position: 'absolute',
              top: dot.top,
              width: dot.size,
            }}
          />
        ))}
      </div>
    </>
  );
};

const Scene = ({ children, contentStyle }: { children: ReactNode; contentStyle?: CSSProperties }) => (
  <AbsoluteFill
    style={{
      backgroundColor: colors.background,
      color: colors.charcoal,
      fontFamily: uiFontFamily,
      overflow: 'hidden',
    }}
  >
    <SceneEffects />
    <div
      style={{
        background: `linear-gradient(90deg, ${colors.green} 0 34%, ${colors.blue} 34% 68%, ${colors.orange} 68% 100%)`,
        height: 14,
        width: '100%',
      }}
    />
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 34,
        height: '100%',
        justifyContent: 'center',
        padding: '92px 118px 110px',
        ...contentStyle,
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

const Dot = ({ color }: { color: string }) => (
  <span
    style={{
      backgroundColor: color,
      borderRadius: 999,
      display: 'inline-block',
      flex: '0 0 auto',
      height: 18,
      width: 18,
    }}
  />
);

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      alignItems: 'center',
      color: colors.greenDark,
      display: 'flex',
      fontSize: 34,
      fontWeight: 800,
      gap: 18,
      letterSpacing: 0,
      textTransform: 'uppercase',
    }}
  >
    <Dot color={colors.green} />
    {children}
  </div>
);

const Headline = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <h1
    style={{
      color: colors.charcoal,
      fontSize: 88,
      fontWeight: 900,
      letterSpacing: 0,
      lineHeight: 0.98,
      margin: 0,
      maxWidth: 1320,
      ...style,
    }}
  >
    {children}
  </h1>
);

const SupportingText = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <p
    style={{
      color: colors.muted,
      fontSize: 38,
      fontWeight: 650,
      lineHeight: 1.24,
      margin: 0,
      maxWidth: 1380,
      ...style,
    }}
  >
    {children}
  </p>
);

const TerminalLine = ({ children, color = colors.charcoal }: { children: ReactNode; color?: string }) => (
  <div
    style={{
      alignItems: 'center',
      color,
      display: 'flex',
      fontFamily: codeFontFamily,
      fontSize: 36,
      fontWeight: 750,
      gap: 18,
      minHeight: 52,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const toneStyles = {
  blue: { borderColor: '#93c5fd', color: colors.blue, soft: colors.softBlue, text: colors.blueDark },
  green: { borderColor: '#9ce2c3', color: colors.green, soft: colors.softGreen, text: colors.greenDark },
  orange: { borderColor: '#fdba74', color: colors.orange, soft: colors.softOrange, text: '#8a4b07' },
} satisfies Record<Tone, { borderColor: string; color: string; soft: string; text: string }>;

type CapabilityKind = 'automate' | 'collect' | 'research' | 'test';

const CapabilityBlock = ({
  caption,
  delay,
  index,
  kind,
  title,
  tone,
}: {
  caption: string;
  delay: number;
  index: string;
  kind: CapabilityKind;
  title: string;
  tone: Tone;
}) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div
      style={{
        ...cardStyle({
          backgroundColor: colors.panel,
          borderColor: theme.borderColor,
          display: 'grid',
          gap: 20,
          gridTemplateRows: 'auto 1fr',
          minHeight: 214,
          opacity: clamp(frame, [delay, delay + 22], [0, 1]),
          padding: 28,
          scale: clamp(frame, [delay, delay + 26], [0.95, 1]),
          translate: `0 ${clamp(frame, [delay, delay + 28], [28, 0])}px`,
        }),
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 18 }}>
        <div
          style={{
            alignItems: 'center',
            backgroundColor: theme.soft,
            border: `2px solid ${theme.borderColor}`,
            borderRadius: 20,
            color: theme.text,
            display: 'flex',
            flex: '0 0 auto',
            fontSize: 30,
            fontWeight: 900,
            height: 64,
            justifyContent: 'center',
            width: 64,
          }}
        >
          {index}
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ color: colors.charcoal, fontSize: 42, fontWeight: 900, lineHeight: 1 }}>{title}</div>
          <div style={{ color: colors.muted, fontSize: 28, fontWeight: 760, lineHeight: 1.12 }}>
            {caption}
          </div>
        </div>
      </div>
      <CapabilityVisual delay={delay + 34} kind={kind} tone={tone} />
    </div>
  );
};

const CapabilityVisual = ({ delay, kind, tone }: { delay: number; kind: CapabilityKind; tone: Tone }) => {
  if (kind === 'research') return <ResearchVisual delay={delay} tone={tone} />;
  if (kind === 'collect') return <CollectVisual delay={delay} tone={tone} />;
  if (kind === 'automate') return <AutomateVisual delay={delay} tone={tone} />;
  return <TestVisual delay={delay} tone={tone} />;
};

const MiniChrome = ({ children, delay, title }: { children: ReactNode; delay: number; title: string }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        ...scaleInStyle(frame, delay),
        backgroundColor: '#f8faf9',
        border: `2px solid ${colors.border}`,
        borderRadius: 16,
        display: 'grid',
        gridTemplateRows: '34px 1fr',
        minHeight: 122,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          borderBottom: `2px solid ${colors.border}`,
          display: 'flex',
          gap: 7,
          padding: '0 12px',
        }}
      >
        <Dot color="#ef4444" />
        <Dot color="#f59e0b" />
        <Dot color="#22c55e" />
        <div style={{ color: colors.muted, fontSize: 18, fontWeight: 820, marginLeft: 'auto' }}>{title}</div>
      </div>
      {children}
    </div>
  );
};

const MiniCheck = ({ delay, size = 20 }: { delay: number; size?: number }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        alignItems: 'center',
        backgroundColor: colors.green,
        borderRadius: 999,
        color: '#fff',
        display: 'flex',
        fontSize: size * 0.62,
        fontWeight: 900,
        height: size,
        justifyContent: 'center',
        opacity: clamp(frame, [delay, delay + 14], [0, 1]),
        scale: clamp(frame, [delay, delay + 18], [0.58, 1]),
        width: size,
      }}
    >
      ✓
    </div>
  );
};

const SummaryBullet = ({ children, delay }: { children: ReactNode; delay: number }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        alignItems: 'center',
        color: colors.charcoal,
        display: 'grid',
        fontSize: 19,
        fontWeight: 780,
        gap: 7,
        gridTemplateColumns: '20px 1fr',
        lineHeight: 1.06,
        opacity: clamp(frame, [delay, delay + 16], [0, 1]),
      }}
    >
      <MiniCheck delay={delay} size={18} />
      <span>{children}</span>
    </div>
  );
};

const ResearchVisual = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 0.92fr' }}>
      <MiniChrome delay={delay} title="browser">
        <div style={{ display: 'grid', gap: 9, padding: 12 }}>
          {['pricing', 'docs', 'github'].map((tab, index) => (
            <div
              key={tab}
              style={{
                alignItems: 'center',
                backgroundColor: index === 0 ? theme.soft : '#ffffff',
                border: `2px solid ${index === 0 ? theme.borderColor : colors.border}`,
                borderRadius: 999,
                color: index === 0 ? theme.text : colors.muted,
                display: 'flex',
                fontSize: 20,
                fontWeight: 850,
                height: 30,
                justifyContent: 'center',
                opacity: clamp(frame, [delay + 10 + index * 10, delay + 26 + index * 10], [0, 1]),
                scale: clamp(frame, [delay + 10 + index * 10, delay + 28 + index * 10], [0.86, 1]),
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      </MiniChrome>
      <div
        style={{
          ...scaleInStyle(frame, delay + 46),
          backgroundColor: '#ffffff',
          border: `2px solid ${theme.borderColor}`,
          borderRadius: 16,
          display: 'grid',
          gap: 8,
          padding: 14,
        }}
      >
        <div style={{ color: theme.text, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>Summary ready</div>
        <SummaryBullet delay={delay + 62}>pricing compared</SummaryBullet>
        <SummaryBullet delay={delay + 76}>docs checked</SummaryBullet>
        <SummaryBullet delay={delay + 90}>key differences found</SummaryBullet>
      </div>
    </div>
  );
};

const HighlightRow = ({
  delay,
  label,
  tone,
  value,
}: {
  delay: number;
  label: string;
  tone: Tone;
  value: string;
}) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div
      style={{
        backgroundColor: theme.soft,
        border: `2px solid ${theme.borderColor}`,
        borderRadius: 10,
        color: theme.text,
        display: 'grid',
        fontSize: 18,
        fontWeight: 840,
        gap: 5,
        gridTemplateColumns: '1fr auto',
        opacity: clamp(frame, [delay, delay + 16], [0, 1]),
        padding: '6px 8px',
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
};

const JsonLine = ({ delay, text }: { delay: number; text: string }) => {
  const frame = useCurrentFrame();

  return <div style={{ opacity: clamp(frame, [delay, delay + 14], [0, 1]) }}>{text}</div>;
};

const CollectVisual = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 0.95fr' }}>
      <MiniChrome delay={delay} title="product page">
        <div style={{ display: 'grid', gap: 7, padding: 12 }}>
          <HighlightRow delay={delay + 20} label="Price" tone={tone} value="$29" />
          <HighlightRow delay={delay + 34} label="Rating" tone={tone} value="4.8" />
          <HighlightRow delay={delay + 48} label="Availability" tone={tone} value="in stock" />
        </div>
      </MiniChrome>
      <div
        style={{
          ...scaleInStyle(frame, delay + 56),
          backgroundColor: colors.charcoal,
          borderRadius: 16,
          color: '#dff5eb',
          display: 'grid',
          fontFamily: codeFontFamily,
          fontSize: 19,
          fontWeight: 760,
          lineHeight: 1.3,
          padding: '13px 15px',
        }}
      >
        <JsonLine delay={delay + 62} text="{" />
        <JsonLine delay={delay + 72} text={'  "price": "$29",'} />
        <JsonLine delay={delay + 82} text={'  "rating": "4.8",'} />
        <JsonLine delay={delay + 92} text={'  "stock": "in stock"'} />
        <JsonLine delay={delay + 102} text="}" />
        <div
          style={{
            backgroundColor: theme.color,
            borderRadius: 999,
            height: 6,
            marginTop: 6,
            width: `${clamp(frame, [delay + 68, delay + 108], [0, 100])}%`,
          }}
        />
      </div>
    </div>
  );
};

const WorkflowStep = ({
  delay,
  icon,
  label,
  tone,
}: {
  delay: number;
  icon: string;
  label: string;
  tone: Tone;
}) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div
      style={{
        alignItems: 'center',
        backgroundColor: '#ffffff',
        border: `2px solid ${theme.borderColor}`,
        borderRadius: 16,
        color: colors.charcoal,
        display: 'grid',
        gap: 6,
        justifyItems: 'center',
        minHeight: 78,
        opacity: clamp(frame, [delay, delay + 16], [0, 1]),
        padding: '9px 8px',
        scale: clamp(frame, [delay, delay + 18], [0.86, 1]),
      }}
    >
      <div
        style={{
          alignItems: 'center',
          backgroundColor: theme.soft,
          borderRadius: 999,
          color: theme.text,
          display: 'flex',
          fontSize: 18,
          fontWeight: 900,
          height: 30,
          justifyContent: 'center',
          width: 42,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 19, fontWeight: 870, lineHeight: 1 }}>{label}</div>
    </div>
  );
};

const WorkflowConnector = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div
      style={{
        alignSelf: 'center',
        opacity: clamp(frame, [delay, delay + 22], [0, 1]),
        scale: clamp(frame, [delay, delay + 22], [0.76, 1]),
      }}
    >
      <Arrow
        cornerRadius={3}
        direction="right"
        fill={theme.color}
        headLength={10}
        headWidth={16}
        length={26}
        shaftWidth={6}
        style={{ display: 'block', height: 16, width: 26 }}
      />
    </div>
  );
};

const AutomateVisual = ({ delay, tone }: { delay: number; tone: Tone }) => (
  <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 26px 1fr 26px 1fr 26px 1fr' }}>
    <WorkflowStep delay={delay} icon="ID" label="Profile" tone={tone} />
    <WorkflowConnector delay={delay + 18} tone={tone} />
    <WorkflowStep delay={delay + 32} icon="Aa" label="Form" tone={tone} />
    <WorkflowConnector delay={delay + 50} tone={tone} />
    <WorkflowStep delay={delay + 64} icon=">" label="Click" tone={tone} />
    <WorkflowConnector delay={delay + 82} tone={tone} />
    <WorkflowStep delay={delay + 96} icon="DL" label="Download" tone={tone} />
  </div>
);

const TestFlowStep = ({ delay, label, tone }: { delay: number; label: string; tone: Tone }) => {
  const frame = useCurrentFrame();
  const theme = toneStyles[tone];

  return (
    <div
      style={{
        alignItems: 'center',
        display: 'grid',
        gap: 8,
        justifyItems: 'center',
        opacity: clamp(frame, [delay, delay + 16], [0, 1]),
      }}
    >
      <div
        style={{
          backgroundColor: theme.soft,
          border: `2px solid ${theme.borderColor}`,
          borderRadius: 14,
          color: theme.text,
          fontSize: 19,
          fontWeight: 870,
          padding: '10px 8px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        {label}
      </div>
      <MiniCheck delay={delay + 12} size={24} />
    </div>
  );
};

const TestVisual = ({ delay, tone }: { delay: number; tone: Tone }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        ...scaleInStyle(frame, delay),
        backgroundColor: '#f8faf9',
        border: `2px solid ${colors.border}`,
        borderRadius: 16,
        display: 'grid',
        gap: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          border: `2px solid ${colors.border}`,
          borderRadius: 12,
          height: 18,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: colors.green,
            height: '100%',
            width: `${clamp(frame, [delay + 20, delay + 96], [0, 100])}%`,
          }}
        />
      </div>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {['Login', 'Cart', 'Checkout', 'Success'].map((label, index) => (
          <TestFlowStep delay={delay + 20 + index * 18} key={label} label={label} tone={tone} />
        ))}
      </div>
    </div>
  );
};

const STAR_CLICK_FRAME = 122;
const STAR_BUTTON_SIZE = 244;
const STAR_ICON_SIZE = 120;
const STAR_STAGE_SIZE = 324;

const StarIcon = ({
  clickFrame,
  frame,
  size = STAR_ICON_SIZE,
}: {
  clickFrame: number;
  frame: number;
  size?: number;
}) => {
  const fillOpacity = clamp(frame, [clickFrame + 14, clickFrame + 38], [0, 1]);
  const iconScale = interpolate(
    frame,
    [clickFrame, clickFrame + 18, clickFrame + 42, clickFrame + 68],
    [1, 0.72, 1.12, 1],
    {
      easing: Easing.bezier(0.7, 0, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return (
    <Star
      effects={[
        glow({
          color: colors.orange,
          intensity: clamp(frame, [clickFrame + 8, clickFrame + 46], [0.2, 0.95]),
          radius: 16,
          threshold: 0.05,
        }),
        shine({
          angle: -28,
          coreIntensity: 0.24,
          haloIntensity: 0.18,
          progress: clamp(frame, [clickFrame + 8, clickFrame + 70], [0, 1]),
        }),
      ]}
      fill={colors.orange}
      fillOpacity={fillOpacity}
      innerRadius={size * 0.24}
      outerRadius={size * 0.49}
      points={5}
      stroke={colors.orange}
      strokeLinejoin="round"
      strokeWidth={3}
      style={{
        display: 'block',
        filter: 'drop-shadow(0 18px 18px rgb(217 119 6 / 0.22))',
        height: size,
        scale: iconScale,
        width: size,
      }}
    />
  );
};

const StarParticle = ({
  clickFrame,
  color,
  frame,
  index,
  total,
}: {
  clickFrame: number;
  color: string;
  frame: number;
  index: number;
  total: number;
}) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const progress = clamp(frame, [clickFrame + 12, clickFrame + 72], [0, 1]);
  const fadeOut = clamp(frame, [clickFrame + 50, clickFrame + 88], [1, 0]);
  const length = clamp(frame, [clickFrame + 12, clickFrame + 42], [18, 54]) * fadeOut;
  const radius = 148 * progress;

  return (
    <div
      style={{
        backgroundColor: color,
        borderRadius: 999,
        height: length,
        left: '50%',
        opacity: clamp(frame, [clickFrame + 10, clickFrame + 18], [0, 1]) * fadeOut,
        position: 'absolute',
        rotate: `${(angle * 180) / Math.PI}deg`,
        top: '50%',
        translate: `${Math.cos(angle) * radius}px ${Math.sin(angle) * radius}px`,
        width: 18,
      }}
    />
  );
};

const StarRipple = ({ clickFrame, frame }: { clickFrame: number; frame: number }) => {
  const opacity =
    clamp(frame, [clickFrame + 4, clickFrame + 12], [0, 0.9]) *
    clamp(frame, [clickFrame + 36, clickFrame + 78], [1, 0]);
  const scale = clamp(frame, [clickFrame + 4, clickFrame + 76], [0.08, 4.2]);

  return (
    <div
      style={{
        border: `28px solid ${colors.orange}`,
        borderRadius: 999,
        height: STAR_BUTTON_SIZE,
        opacity,
        position: 'absolute',
        scale,
        width: STAR_BUTTON_SIZE,
      }}
    />
  );
};

const StarLikeButton = ({ frame }: { frame: number }) => {
  const entryScale = clamp(frame, [40, 74], [0.78, 1]);
  const pressScale = interpolate(
    frame,
    [STAR_CLICK_FRAME, STAR_CLICK_FRAME + 16, STAR_CLICK_FRAME + 38, STAR_CLICK_FRAME + 66],
    [1, 0.9, 1.04, 1],
    {
      easing: Easing.bezier(0.7, 0, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const shadowScale = interpolate(
    frame,
    [STAR_CLICK_FRAME, STAR_CLICK_FRAME + 16, STAR_CLICK_FRAME + 42],
    [1, 0.5, 1],
    {
      easing: Easing.bezier(0.7, 0, 0.3, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );
  const particles = ['#12805c', '#2563eb', '#d97706', '#0f513d', '#93c5fd', '#fdba74', '#17211f', '#9ce2c3'];

  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        height: STAR_STAGE_SIZE,
        justifyContent: 'center',
        opacity: clamp(frame, [34, 62], [0, 1]),
        position: 'relative',
        scale: entryScale,
        width: STAR_STAGE_SIZE,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgb(23 33 31 / 0.20)',
          borderRadius: 999,
          filter: 'blur(4px)',
          height: STAR_BUTTON_SIZE,
          position: 'absolute',
          scale: shadowScale,
          translate: '0 30px',
          width: STAR_BUTTON_SIZE,
        }}
      />
      <div
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: 999,
          boxShadow: '0 38px 80px rgb(23 33 31 / 0.24)',
          display: 'grid',
          height: STAR_BUTTON_SIZE,
          justifyItems: 'center',
          overflow: 'hidden',
          placeItems: 'center',
          position: 'relative',
          scale: pressScale,
          width: STAR_BUTTON_SIZE,
        }}
      >
        <StarRipple clickFrame={STAR_CLICK_FRAME} frame={frame} />
        <StarIcon clickFrame={STAR_CLICK_FRAME} frame={frame} />
      </div>
      <CtaLottieAccent frame={frame} />
      <CtaEmojiAccent frame={frame} />
      {particles.map((color, index) => (
        <StarParticle
          clickFrame={STAR_CLICK_FRAME}
          color={color}
          frame={frame}
          index={index}
          key={color}
          total={particles.length}
        />
      ))}
    </div>
  );
};

const parseLottieAnimationData = (value: unknown): LottieAnimationData => value as LottieAnimationData;

const useLottieAnimationData = (path: string): LottieAnimationData | null => {
  const [handle] = useState(() => delayRender(`Load ${path}`));
  const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch(staticFile(path))
      .then(async (response) => {
        if (!response.ok) throw new Error(`Unable to load Lottie asset: ${path}`);
        return parseLottieAnimationData(await response.json());
      })
      .then((loadedAnimationData) => {
        if (mounted) setAnimationData(loadedAnimationData);
        continueRender(handle);
      })
      .catch((error: unknown) => {
        cancelRender(error);
      });

    return () => {
      mounted = false;
    };
  }, [handle, path]);

  return animationData;
};

const CtaLottieAccent = ({ frame }: { frame: number }) => {
  const animationData = useLottieAnimationData('sparkle-burst.json');
  const opacity =
    clamp(frame, [STAR_CLICK_FRAME + 8, STAR_CLICK_FRAME + 24], [0, 0.8]) *
    clamp(frame, [STAR_CLICK_FRAME + 92, STAR_CLICK_FRAME + 132], [1, 0]);

  if (!animationData) return null;

  return (
    <div
      style={{
        height: 210,
        left: '50%',
        opacity,
        pointerEvents: 'none',
        position: 'absolute',
        top: '50%',
        translate: '-186px -178px',
        width: 210,
      }}
    >
      <Lottie
        animationData={animationData}
        loop
        playbackRate={1.25}
        style={{ display: 'block', height: '100%', width: '100%' }}
      />
    </div>
  );
};

const CtaEmojiAccent = ({ frame }: { frame: number }) => {
  const opacity =
    clamp(frame, [STAR_CLICK_FRAME + 22, STAR_CLICK_FRAME + 42], [0, 0.9]) *
    clamp(frame, [STAR_CLICK_FRAME + 118, STAR_CLICK_FRAME + 154], [1, 0]);
  const accentScale = clamp(frame, [STAR_CLICK_FRAME + 24, STAR_CLICK_FRAME + 54], [0.66, 1]);

  return (
    <div
      style={{
        height: 78,
        left: '50%',
        opacity,
        pointerEvents: 'none',
        position: 'absolute',
        scale: accentScale,
        top: '50%',
        translate: '90px -164px',
        width: 78,
      }}
    >
      <AnimatedEmoji
        emoji="glowing-star"
        playbackRate={1.3}
        scale="0.5"
        style={{ display: 'block', height: '100%', width: '100%' }}
      />
    </div>
  );
};

const StarCursorPointer = () => {
  const frame = useCurrentFrame();
  const cursorX = clamp(frame, [84, STAR_CLICK_FRAME], [196, 66]);
  const cursorY = clamp(frame, [84, STAR_CLICK_FRAME], [204, 92]);
  const clickScale =
    clamp(frame, [STAR_CLICK_FRAME, STAR_CLICK_FRAME + 10], [1, 0.78]) *
    clamp(frame, [STAR_CLICK_FRAME + 10, STAR_CLICK_FRAME + 28], [1, 1.18]);

  return (
    <div
      style={{
        backgroundColor: colors.charcoal,
        clipPath: 'polygon(0 0, 0 100%, 32% 72%, 52% 100%, 68% 91%, 48% 63%, 86% 63%)',
        filter: 'drop-shadow(0 10px 14px rgb(23 33 31 / 0.22))',
        height: 72,
        left: '50%',
        opacity: clamp(frame, [78, 90], [0, 1]) * clamp(frame, [180, 210], [1, 0]),
        position: 'absolute',
        scale: clickScale,
        top: '50%',
        translate: `${cursorX}px ${cursorY}px`,
        width: 58,
      }}
    />
  );
};

const StarAction = ({ frame }: { frame: number }) => {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'grid',
        gap: 18,
        justifyItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative' }}>
        <StarLikeButton frame={frame} />
        <Trail lagInFrames={0.28} layers={7} trailOpacity={0.18}>
          <AbsoluteFill style={{ overflow: 'visible', pointerEvents: 'none' }}>
            <StarCursorPointer />
          </AbsoluteFill>
        </Trail>
      </div>
      <div style={{ ...enterStyle(frame, 62), color: colors.charcoal, fontSize: 46, fontWeight: 900 }}>
        Star the project
      </div>
      <div style={{ ...enterStyle(frame, 74), color: colors.muted, fontSize: 34, fontWeight: 800 }}>
        Star the repo · Read the docs
      </div>
    </div>
  );
};

const HumanTypedPrompt = ({
  startFrame = 20,
  steps,
  style,
}: {
  startFrame?: number;
  steps: readonly TypingStep[];
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const visibleText = typedTextAtFrame(steps, Math.max(0, frame - startFrame));
  const isTyping = visibleText !== researchPrompt;
  const cursorVisible = isTyping || Math.floor(frame / 12) % 2 === 0;

  return (
    <span style={style}>
      {visibleText}
      <span style={{ color: colors.blue, opacity: cursorVisible ? 1 : 0 }}>|</span>
    </span>
  );
};

const ChatControl = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'blue' | 'neutral' }) => (
  <div
    style={{
      alignItems: 'center',
      backgroundColor: tone === 'blue' ? colors.softBlue : '#eef3f1',
      border: `2px solid ${tone === 'blue' ? '#93c5fd' : colors.border}`,
      borderRadius: 999,
      color: tone === 'blue' ? colors.blueDark : colors.muted,
      display: 'flex',
      fontSize: 22,
      fontWeight: 850,
      height: 44,
      padding: '0 18px',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

const ChatHeader = () => (
  <div
    style={{
      backgroundColor: '#edf3f0',
      borderBottom: `2px solid ${colors.border}`,
      display: 'flex',
      gap: 12,
      padding: '18px 22px',
    }}
  >
    <Dot color={colors.green} />
    <div style={{ color: colors.charcoal, fontSize: 25, fontWeight: 900 }}>CloakBrowser MCP</div>
    <div style={{ color: colors.muted, fontSize: 24, fontWeight: 750, marginLeft: 'auto' }}>
      Research chat
    </div>
  </div>
);

const ChatAssistantBubble = () => (
  <>
    <div
      style={{
        display: 'grid',
        gap: 18,
        gridTemplateColumns: '72px 1fr',
        padding: '26px 30px 18px',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          backgroundColor: colors.charcoal,
          borderRadius: 18,
          color: '#fff',
          display: 'flex',
          fontSize: 28,
          fontWeight: 900,
          height: 58,
          justifyContent: 'center',
          width: 58,
        }}
      >
        AI
      </div>
      <div
        style={{
          backgroundColor: '#ffffff',
          border: `2px solid ${colors.border}`,
          borderRadius: 22,
          color: colors.muted,
          fontSize: 28,
          fontWeight: 750,
          lineHeight: 1.25,
          padding: '20px 24px',
        }}
      >
        Ask once. The agent drives the browser.
      </div>
    </div>
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '0 30px 18px 120px',
      }}
    >
      <ChatControl tone="blue">browser tools</ChatControl>
      <ChatControl>CloakBrowser</ChatControl>
    </div>
  </>
);

const SubmitButton = ({ submitFrame }: { submitFrame: number }) => {
  const frame = useCurrentFrame();
  const press =
    clamp(frame, [submitFrame, submitFrame + 8], [0, 1]) *
    clamp(frame, [submitFrame + 8, submitFrame + 24], [1, 0]);
  const pulseOpacity =
    clamp(frame, [submitFrame + 8, submitFrame + 16], [0, 0.32]) *
    clamp(frame, [submitFrame + 16, submitFrame + 42], [1, 0]);

  return (
    <div style={{ height: 52, marginLeft: 'auto', position: 'relative', width: 52 }}>
      <div
        style={{
          backgroundColor: colors.green,
          borderRadius: 999,
          inset: -8,
          opacity: pulseOpacity,
          position: 'absolute',
          scale: clamp(frame, [submitFrame + 8, submitFrame + 42], [0.75, 1.38]),
        }}
      />
      <div
        style={{
          alignItems: 'center',
          backgroundColor: colors.charcoal,
          borderRadius: 999,
          color: '#fff',
          display: 'flex',
          fontSize: 32,
          fontWeight: 900,
          height: 52,
          justifyContent: 'center',
          position: 'relative',
          scale: 1 - press * 0.14,
          translate: `${press * 4}px 0`,
          width: 52,
        }}
      >
        &gt;
      </div>
    </div>
  );
};

const ChatComposer = ({ startFrame, submitFrame }: { startFrame: number; submitFrame: number }) => (
  <div
    style={{
      backgroundColor: '#ffffff',
      border: `2px solid ${colors.border}`,
      borderRadius: 30,
      boxShadow: '0 18px 44px rgb(23 33 31 / 0.10)',
      display: 'flex',
      flexDirection: 'column',
      gap: 18,
      margin: 'auto 30px 30px',
      minHeight: 164,
      padding: '24px 26px 22px',
    }}
  >
    <HumanTypedPrompt
      startFrame={startFrame}
      steps={researchTypingSteps}
      style={{ color: colors.charcoal, fontSize: 35, fontWeight: 850, lineHeight: 1.2 }}
    />
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        gap: 12,
        marginTop: 'auto',
      }}
    >
      <ChatControl>+</ChatControl>
      <ChatControl>FX rates</ChatControl>
      <SubmitButton submitFrame={submitFrame} />
    </div>
  </div>
);

const ChatPromptPanel = ({ startFrame, submitFrame }: { startFrame: number; submitFrame: number }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        ...cardStyle({
          ...scaleInStyle(frame, 22),
          backgroundColor: '#f8faf9',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 438,
          overflow: 'hidden',
          padding: 0,
          position: 'relative',
        }),
      }}
    >
      <ChatHeader />
      <ChatAssistantBubble />
      <ChatComposer startFrame={startFrame} submitFrame={submitFrame} />
    </div>
  );
};

const TraceStep = ({
  delay,
  detail,
  label,
  tone = 'green',
}: {
  delay: number;
  detail: string;
  label: string;
  tone?: Tone;
}) => {
  const frame = useCurrentFrame();
  const toneColor = tone === 'blue' ? colors.blue : tone === 'orange' ? colors.orange : colors.green;

  return (
    <div
      style={{
        ...enterStyle(frame, delay),
        backgroundColor: '#ffffff',
        border: `2px solid ${colors.border}`,
        borderRadius: 20,
        display: 'grid',
        gap: 7,
        minHeight: 82,
        padding: '14px 18px',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          color: toneColor,
          display: 'flex',
          fontSize: 21,
          fontWeight: 900,
          gap: 10,
          textTransform: 'uppercase',
        }}
      >
        <Dot color={toneColor} />
        {label}
      </div>
      <div
        style={{
          color: colors.charcoal,
          fontFamily: label === 'Tool' ? codeFontFamily : undefined,
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1.18,
        }}
      >
        {detail}
      </div>
    </div>
  );
};

const traceScrollY = (frame: number, startFrame: number): number =>
  clamp(
    frame,
    [startFrame + TRACE_SCROLL_START_OFFSET, startFrame + TRACE_SCROLL_END_OFFSET],
    [0, (traceActivities.length - TRACE_VISIBLE_ROWS) * TRACE_ROW_ADVANCE],
  );

const TraceScrollbar = ({ frame, startFrame }: { frame: number; startFrame: number }) => {
  const thumbY = clamp(
    frame,
    [startFrame + TRACE_SCROLL_START_OFFSET, startFrame + TRACE_SCROLL_END_OFFSET],
    [0, TRACE_SCROLL_TRACK_HEIGHT - TRACE_SCROLL_THUMB_HEIGHT],
  );

  return (
    <div
      style={{
        backgroundColor: '#e4ebe8',
        borderRadius: 999,
        bottom: 16,
        position: 'absolute',
        right: 10,
        top: 16,
        width: 9,
      }}
    >
      <div
        style={{
          backgroundColor: colors.green,
          borderRadius: 999,
          height: TRACE_SCROLL_THUMB_HEIGHT,
          translate: `0 ${thumbY}px`,
          width: '100%',
        }}
      />
    </div>
  );
};

const TraceViewport = ({ frame, startFrame }: { frame: number; startFrame: number }) => {
  const scrollY = traceScrollY(frame, startFrame);

  return (
    <div
      style={{
        borderRadius: 22,
        flex: 1,
        minHeight: TRACE_VIEWPORT_HEIGHT,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingRight: 22,
          translate: `0 -${scrollY}px`,
        }}
      >
        {traceActivities.map((activity) => (
          <TraceStep
            delay={startFrame + activity.offset}
            detail={activity.detail}
            key={`${activity.label}-${activity.offset}`}
            label={activity.label}
            tone={activity.tone}
          />
        ))}
      </div>
      <TraceScrollbar frame={frame} startFrame={startFrame} />
    </div>
  );
};

const AgentTrace = ({ startFrame }: { startFrame: number }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        ...cardStyle({
          ...scaleInStyle(frame, startFrame),
          backgroundColor: '#f8faf9',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 438,
          padding: 24,
        }),
      }}
    >
      <div
        style={{
          alignItems: 'center',
          color: colors.muted,
          display: 'flex',
          fontSize: 27,
          fontWeight: 900,
          gap: 14,
          padding: '0 4px 4px',
        }}
      >
        <Dot color={colors.blue} />
        agent activity
      </div>
      <TraceViewport frame={frame} startFrame={startFrame} />
    </div>
  );
};

const IntroScene = () => {
  const frame = useCurrentFrame();

  return (
    <Scene>
      <div style={{ ...enterStyle(frame, 0), width: 620 }}>
        <Img src={staticFile('logo-wordmark.svg')} style={{ display: 'block', width: '100%' }} />
      </div>
      <div style={{ ...enterStyle(frame, 6), display: 'flex', flexDirection: 'column', gap: 28 }}>
        <Eyebrow>stealth chromium for ai agents</Eyebrow>
        <Headline style={{ fontSize: 106, maxWidth: 1540 }}>
          Stealth Chromium
          <br />
          for developers and automation.
        </Headline>
        <SupportingText>Real browser control for AI agents.</SupportingText>
      </div>
      <div
        style={{
          ...cardStyle({
            ...scaleInStyle(frame, 24),
            display: 'grid',
            gap: 18,
            maxWidth: 1140,
            padding: 34,
          }),
        }}
      >
        <TerminalLine>
          <span style={{ color: colors.green }}>$</span>
          npx -y cloakbrowser-mcp@latest
        </TerminalLine>
      </div>
    </Scene>
  );
};

const ResearchScene = () => {
  const frame = useCurrentFrame();
  const promptStartFrame = 82;
  const promptDoneFrame = finalTypingFrame(researchTypingSteps) + promptStartFrame;
  const submitFrame = promptDoneFrame + 20;
  const activityStartFrame = submitFrame + 36;

  return (
    <Scene
      contentStyle={{
        boxSizing: 'border-box',
        gap: 22,
        height: 'calc(100% - 14px)',
        justifyContent: 'flex-start',
        padding: '54px 118px 68px',
      }}
    >
      <div style={{ ...enterStyle(frame, 0), display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Eyebrow>website exploration</Eyebrow>
        <Headline style={{ fontSize: 74, maxWidth: 1680 }}>Ask for web research, not scraping code.</Headline>
        <SupportingText>Open sites, compare pages, and return a structured summary.</SupportingText>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 32,
          gridTemplateColumns: '1.08fr 0.92fr',
          height: 520,
          maxWidth: 1580,
        }}
      >
        <ChatPromptPanel startFrame={promptStartFrame} submitFrame={submitFrame} />
        <AgentTrace startFrame={activityStartFrame} />
      </div>
    </Scene>
  );
};

const ConclusionScene = () => {
  const frame = useCurrentFrame();

  return (
    <Scene>
      <div style={{ ...enterStyle(frame, 0), display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Eyebrow>browser capabilities</Eyebrow>
        <Headline style={{ fontSize: 78, maxWidth: 1500 }}>Work with the web like a user.</Headline>
        <SupportingText>Research, collect, automate, and test.</SupportingText>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: '1fr 1fr',
          maxWidth: 1580,
        }}
      >
        <CapabilityBlock
          caption="Compare pages and summarize findings"
          delay={34}
          index="01"
          kind="research"
          title="Research"
          tone="green"
        />
        <CapabilityBlock
          caption="Extract page data into structured output"
          delay={54}
          index="02"
          kind="collect"
          title="Collect"
          tone="blue"
        />
        <CapabilityBlock
          caption="Run repeatable browser workflows"
          delay={74}
          index="03"
          kind="automate"
          title="Automate"
          tone="orange"
        />
        <CapabilityBlock
          caption="Check end-to-end paths"
          delay={94}
          index="04"
          kind="test"
          title="Test"
          tone="green"
        />
      </div>
    </Scene>
  );
};

const CtaScene = () => {
  const frame = useCurrentFrame();

  return (
    <Scene>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 34,
          textAlign: 'center',
        }}
      >
        <Img
          src={staticFile('logo-wordmark.svg')}
          style={{ ...enterStyle(frame, 0), display: 'block', width: 610 }}
        />
        <div style={{ ...enterStyle(frame, 8), display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Eyebrow>start in one command</Eyebrow>
          <Headline style={{ maxWidth: 1420 }}>Install CloakBrowser MCP.</Headline>
        </div>
        <div
          style={{
            ...cardStyle({
              ...scaleInStyle(frame, 28),
              minWidth: 1120,
              padding: '38px 46px',
              textAlign: 'left',
            }),
          }}
        >
          <TerminalLine>
            <span style={{ color: colors.green }}>$</span>
            npx -y cloakbrowser-mcp@latest
          </TerminalLine>
        </div>
        <StarAction frame={frame} />
      </div>
    </Scene>
  );
};

const Demo = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[0]}>
        <IntroScene />
      </TransitionSeries.Sequence>
      {sceneTransitions.introToResearch}
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[1]}>
        <ResearchScene />
      </TransitionSeries.Sequence>
      {sceneTransitions.researchToCapabilities}
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[2]}>
        <ConclusionScene />
      </TransitionSeries.Sequence>
      {sceneTransitions.capabilitiesToCta}
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[3]}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

export const RemotionRoot = () => (
  <Composition
    component={Demo}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    height={HEIGHT}
    id="CloakBrowserMcpDemo"
    width={WIDTH}
  />
);

registerRoot(RemotionRoot);
