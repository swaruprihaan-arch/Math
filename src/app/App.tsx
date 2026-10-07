import { useEffect, useState } from 'react';
import { KidView } from '../components/kid/KidView';
import { ParentView } from '../components/parent/ParentView';
import { Welcome } from '../components/family/Welcome';
import { HoldHint } from '../components/common/HoldHint';
import { AppProvider, useApp } from './AppContext';
import { BASEPLATES, THEMES, themeVariables } from './theme';
import { useSession } from './useSession';

function useHashRoute(): string {
  const read = () => (globalThis.location?.hash || '#/').replace(/^#/, '') || '/';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    globalThis.addEventListener('hashchange', onChange);
    return () => globalThis.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** Applies the parent's look settings to <html>/<body>. */
function ThemeEffect() {
  const { settings } = useApp();
  useEffect(() => {
    const vars = themeVariables(settings);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    const body = document.body;
    const theme = THEMES[settings.look.theme];
    body.classList.remove('studs');
    root.classList.toggle('studs', settings.look.studs && !settings.look.simple);
    body.classList.toggle('simple', settings.look.simple);
    body.classList.toggle('high-contrast', settings.look.highContrast);
    body.classList.toggle('no-anim', !settings.look.animations);
    body.classList.toggle('big-buttons', settings.look.bigButtons);
    body.classList.toggle('theme-rainbow', !!theme?.rainbow && !settings.look.useCustomColor);
    body.classList.toggle('theme-white', theme?.name === 'White' && !settings.look.useCustomColor);
    for (const b of Object.keys(BASEPLATES)) body.classList.toggle(`baseplate-${b}`, settings.look.baseplate === b);
    root.style.colorScheme = BASEPLATES[settings.look.baseplate]?.dark ? 'dark' : 'light';
  }, [settings]);
  return null;
}

function Screens() {
  const { familyMode, signIn } = useApp();
  if (familyMode && !signIn) {
    return (
      <>
        <ThemeEffect />
        <main>
          <Welcome />
        </main>
      </>
    );
  }
  return <SignedInScreens />;
}

function SignedInScreens() {
  const route = useHashRoute();
  const session = useSession();
  const { lockParent } = useApp();
  useEffect(() => {
    if (!route.startsWith('/parent')) lockParent();
    globalThis.scrollTo?.(0, 0);
  }, [route, lockParent]);
  return (
    <>
      <ThemeEffect />
      <main>{route.startsWith('/parent') ? <ParentView session={session} /> : <KidView session={session} />}</main>
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <Screens />
      <HoldHint />
    </AppProvider>
  );
}
