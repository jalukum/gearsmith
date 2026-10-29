import { useEffect } from 'react';
import { useRoute, href } from './lib/route';
import { Icon, ICONS } from './components/Glyph';
import HeroGrid from './components/HeroGrid';
import HeroPage from './components/HeroPage';
import Saved from './components/Saved';
import Rules from './components/Rules';

export default function App() {
  const route = useRoute();
  useEffect(() => { window.scrollTo(0, 0); }, [route.name, route.name === 'hero' ? route.id : 0]);
  const tab = route.name === 'hero' ? 'heroes' : route.name;
  return (
    <div className="app">
      <main className="main">
        {route.name === 'heroes' && <HeroGrid />}
        {route.name === 'hero' && <HeroPage route={route} />}
        {route.name === 'saved' && <Saved />}
        {route.name === 'rules' && <Rules />}
      </main>
      <nav className="tabbar" aria-label="Main">
        <a href={href({ name: 'heroes' })} className={tab === 'heroes' ? 'on' : ''}><Icon d={ICONS.heroes} /><span>Heroes</span></a>
        <a href={href({ name: 'saved' })} className={tab === 'saved' ? 'on' : ''}><Icon d={ICONS.saved} /><span>Saved</span></a>
        <a href={href({ name: 'rules' })} className={tab === 'rules' ? 'on' : ''}><Icon d={ICONS.rules} /><span>Rules</span></a>
      </nav>
    </div>
  );
}
