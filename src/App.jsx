import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Github, Heart, ShieldCheck, Sparkles } from 'lucide-react';
import Header from './components/Header';
import TabNav from './components/TabNav';
import ClosetTab from './components/ClosetTab';
import TwinTab from './components/TwinTab';
import AgentTab from './components/AgentTab';
import ShareTab from './components/ShareTab';
import ItemModal from './components/ItemModal';
import EvaluateLookModal from './components/EvaluateLookModal';
import { ToastViewport } from './components/ui';
import { DEFAULT_PROFILE, SEED_ITEMS } from './lib/data';
import { colorName } from './lib/colors';
import { buildPlan, fallbackWeather, fetchWeather } from './lib/recommendation';
import { uid, usePersistentState } from './lib/storage';

const VALID_TABS = ['closet', 'twin', 'agent', 'share'];

function normalizeProfile(value) {
  return {
    ...DEFAULT_PROFILE,
    ...(value || {}),
    sizes: { ...DEFAULT_PROFILE.sizes, ...(value?.sizes || {}) },
    photos: { ...DEFAULT_PROFILE.photos, ...(value?.photos || {}) },
  };
}

function normalizeItem(item) {
  const category = ['tops', 'bottoms', 'shoes', 'accessories'].includes(item?.category)
    ? item.category
    : 'tops';
  const colorHex = /^#[0-9a-f]{6}$/i.test(item?.colorHex || '') ? item.colorHex.toUpperCase() : '#8C7B6B';
  return {
    id: item?.id || uid('item'),
    name: item?.name || 'Prenda sin nombre',
    category,
    subtype: item?.subtype || 'Prenda',
    colorName: item?.colorName || colorName(colorHex),
    colorHex,
    style: item?.style || 'Casual',
    formality: Math.min(10, Math.max(1, Number(item?.formality) || 5)),
    season: ['verano', 'invierno', 'transicion', 'todo'].includes(item?.season) ? item.season : 'todo',
    material: item?.material || 'Por definir',
    warmth: Math.min(3, Math.max(1, Number(item?.warmth) || 1)),
    layer: Boolean(item?.layer),
    frequency: ['frecuente', 'ocasional', 'rara'].includes(item?.frequency) ? item.frequency : 'ocasional',
    image: item?.image || '',
    notes: item?.notes || '',
  };
}

export default function App() {
  const [inventory, setInventory, inventoryError] = usePersistentState(
    'aura.inventory.v1',
    () => SEED_ITEMS.map((item) => ({ ...item })),
  );
  const [profile, setProfile, profileError] = usePersistentState('aura.profile.v1', () => normalizeProfile(DEFAULT_PROFILE));
  const [activeTab, setActiveTab] = useState('closet');
  const [plan, setPlan] = useState(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const storageWarned = useRef(false);

  const safeProfile = useMemo(() => normalizeProfile(profile), [profile]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (message, type = 'success', action = null) => {
      const id = uid('toast');
      setToasts((current) => [...current.slice(-3), { id, message, type, action }]);
      const timer = setTimeout(() => dismissToast(id), 5200);
      timers.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  useEffect(() => {
    const storageError = inventoryError || profileError;
    if (storageError && !storageWarned.current) {
      storageWarned.current = true;
      notify(storageError, 'error');
    }
  }, [inventoryError, profileError, notify]);

  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash)) setActiveTab(hash);
    };
    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  const changeTab = (tab) => {
    setActiveTab(tab);
    if (VALID_TABS.includes(tab)) window.history.replaceState(null, '', `#${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateProfile = (patch) => {
    setProfile((current) => normalizeProfile({ ...current, ...patch }));
  };

  const openAdd = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleSaveItem = (payload, isEdit) => {
    const item = normalizeItem(payload);
    if (isEdit) {
      setInventory((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
      notify(`“${item.name}” actualizada.`, 'success');
    } else {
      setInventory((current) => [item, ...current]);
      notify(`“${item.name}” añadida a tu clóset.`, 'success');
    }
  };

  const handleDelete = (item) => {
    setInventory((current) => current.filter((entry) => entry.id !== item.id));
    notify(`“${item.name}” eliminada.`, 'info', {
      label: 'Deshacer',
      onClick: () => {
        setInventory((current) => [item, ...current]);
        notify('Prenda restaurada.', 'success');
      },
    });
  };

  const handleAddBatch = (items) => {
    setInventory((current) => [...items.map(normalizeItem), ...current]);
  };

  const handleGenerate = async (trip) => {
    const hasTop = inventory.some((item) => item.category === 'tops');
    const hasBottom = inventory.some((item) => item.category === 'bottoms');
    const hasShoes = inventory.some((item) => item.category === 'shoes');
    if (!hasTop || !hasBottom || !hasShoes) {
      notify('Para armar un plan necesitas al menos una prenda superior, una inferior y calzado.', 'error');
      return null;
    }

    const days = Math.max(1, Math.min(21, Number(trip.days) || 1));
    const nights = Math.max(0, Math.min(days, Number(trip.nights) || 0));
    let weather;
    let forecastError = '';

    if (trip.climate === 'auto') {
      try {
        const forecast = await fetchWeather(trip.destination, trip.startDate, days);
        if (forecast && !forecast.error) {
          weather = forecast;
        } else {
          forecastError = forecast?.error || '';
          weather = fallbackWeather({
            destination: trip.destination,
            climate: 'auto',
            days,
            startDate: trip.startDate,
            error: forecastError ? `${forecastError} Usamos una referencia estacional.` : '',
          });
        }
      } catch {
        forecastError = 'No pudimos consultar el pronóstico.';
        weather = fallbackWeather({
          destination: trip.destination,
          climate: 'auto',
          days,
          startDate: trip.startDate,
          error: `${forecastError} Usamos una referencia estacional.`,
        });
      }
    } else {
      weather = fallbackWeather({
        destination: trip.destination,
        climate: trip.climate,
        days,
        startDate: trip.startDate,
      });
    }

    const nextPlan = buildPlan({
      profile: safeProfile,
      inventory,
      trip: { ...trip, days, nights },
      weather,
    });
    setPlan(nextPlan);
    notify(
      `Plan listo para ${nextPlan.trip.destination}: ${nextPlan.outfits.length} outfits y ${nextPlan.packing.totalPieces} piezas.`,
      'success',
    );
    if (forecastError) notify('El pronóstico no estaba disponible; usamos clima de referencia.', 'info');
    return nextPlan;
  };

  const handleImport = (data) => {
    const importedProfile = normalizeProfile(data.profile);
    const importedInventory = (data.inventory || []).map(normalizeItem);
    setProfile(importedProfile);
    setInventory(importedInventory);
    setPlan(data.plan || null);
    changeTab('closet');
  };

  const handleReset = () => {
    setInventory(SEED_ITEMS.map((item) => ({ ...item })));
    setProfile(normalizeProfile(DEFAULT_PROFILE));
    setPlan(null);
    setEditingItem(null);
    setItemModalOpen(false);
    changeTab('closet');
  };

  return (
    <div className="grain-overlay min-h-screen">
      <Header mode={safeProfile.mode} onModeChange={(mode) => updateProfile({ mode })} onAddItem={openAdd} />
      <TabNav activeTab={activeTab} onChange={changeTab} itemCount={inventory.length} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div key={activeTab} className="animate-fade-in">
          {activeTab === 'closet' && (
            <ClosetTab
              inventory={inventory}
              profile={safeProfile}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAddBatch={handleAddBatch}
              onEvaluate={() => setEvaluateOpen(true)}
              notify={notify}
            />
          )}
          {activeTab === 'twin' && (
            <TwinTab
              profile={safeProfile}
              inventory={inventory}
              onUpdateProfile={updateProfile}
              notify={notify}
            />
          )}
          {activeTab === 'agent' && (
            <AgentTab
              profile={safeProfile}
              inventory={inventory}
              plan={plan}
              onGenerate={handleGenerate}
              notify={notify}
              onGoCloset={() => changeTab('closet')}
            />
          )}
          {activeTab === 'share' && (
            <ShareTab
              profile={safeProfile}
              inventory={inventory}
              plan={plan}
              onImport={handleImport}
              onReset={handleReset}
              notify={notify}
            />
          )}
        </div>
      </main>

      <footer className="mt-4 border-t border-white/8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sand/20 bg-sand/[0.06] font-display text-lg text-sand-soft">
              A
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-cream/60">AURA · STYLIST AI</p>
              <p className="text-[9px] text-cream/25">Tu clóset, con intención. Demo funcional local-first.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[9px] text-cream/30">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-moss/60" /> Datos en tu navegador
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-sand/60" /> Hecho para decidir en segundos
            </span>
            <a
              href="https://github.com/JuanDeLeon24/aura-stylist-ai"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-cream/60"
            >
              <Github className="h-3 w-3" /> Código
            </a>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-clay/60" /> v1.0
            </span>
          </div>
        </div>
      </footer>

      <ItemModal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        profile={safeProfile}
        onSave={handleSaveItem}
      />
      <EvaluateLookModal
        open={evaluateOpen}
        onClose={() => setEvaluateOpen(false)}
        inventory={inventory}
        profile={safeProfile}
      />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
