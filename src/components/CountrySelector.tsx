import { useState, useMemo } from 'react';
import { COUNTRIES, CONTINENT_LABELS, type Country, type Continent } from '@/data/countries';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Star, StarOff, Globe } from 'lucide-react';

const FAVORITES_KEY = 'publify_fav_countries';
const RECENT_KEY = 'publify_recent_countries';

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

interface CountrySelectorProps {
  value: string | null;
  onChange: (country: Country) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const [search, setSearch] = useState('');
  const [continentFilter, setContinentFilter] = useState<Continent | null>(null);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [recent] = useState<string[]>(loadRecent);

  const toggleFavorite = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSelect = (country: Country) => {
    onChange(country);
    // Update recent
    const updatedRecent = [country.code, ...recent.filter(c => c !== country.code)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updatedRecent));
  };

  const searchLower = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    let list = COUNTRIES;
    if (continentFilter) {
      list = list.filter(c => c.continent === continentFilter);
    }
    if (searchLower) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.currency.toLowerCase().includes(searchLower) ||
        c.code.toLowerCase().includes(searchLower) ||
        c.flag.includes(searchLower)
      );
    }
    return list;
  }, [searchLower, continentFilter]);

  // Separate favorites and recent at top
  const favoriteCountries = useMemo(() =>
    COUNTRIES.filter(c => favorites.includes(c.code)),
    [favorites]
  );
  const recentCountries = useMemo(() =>
    COUNTRIES.filter(c => recent.includes(c.code) && !favorites.includes(c.code)),
    [recent, favorites]
  );

  const selectedCountry = COUNTRIES.find(c => c.code === value);

  return (
    <div className="space-y-3">
      {/* Selected display */}
      {selectedCountry && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-xl">{selectedCountry.flag}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{selectedCountry.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{selectedCountry.currency}</span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar país, moeda ou idioma..."
          className="pl-9 bg-secondary border-border text-sm"
        />
      </div>

      {/* Continent filters */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={continentFilter === null ? 'default' : 'ghost'}
          size="sm"
          className="h-7 text-xs px-2.5"
          onClick={() => setContinentFilter(null)}
        >
          <Globe className="w-3 h-3 mr-1" />
          Todos
        </Button>
        {(Object.entries(CONTINENT_LABELS) as [Continent, { label: string; emoji: string }][]).map(([key, { label, emoji }]) => (
          <Button
            key={key}
            variant={continentFilter === key ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setContinentFilter(key)}
          >
            {emoji} {label}
          </Button>
        ))}
      </div>

      {/* Country list */}
      <ScrollArea className="h-[280px] rounded-lg border border-border">
        <div className="p-1">
          {/* Favorites section */}
          {!searchLower && favoriteCountries.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                ⭐ Favoritos
              </div>
              {favoriteCountries.map(c => (
                <CountryRow
                  key={`fav-${c.code}`}
                  country={c}
                  selected={value === c.code}
                  isFavorite
                  onSelect={handleSelect}
                  onToggleFav={toggleFavorite}
                />
              ))}
            </>
          )}

          {/* Recent section */}
          {!searchLower && recentCountries.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                🕐 Recentes
              </div>
              {recentCountries.map(c => (
                <CountryRow
                  key={`rec-${c.code}`}
                  country={c}
                  selected={value === c.code}
                  isFavorite={favorites.includes(c.code)}
                  onSelect={handleSelect}
                  onToggleFav={toggleFavorite}
                />
              ))}
            </>
          )}

          {/* All countries */}
          {(!searchLower && (favoriteCountries.length > 0 || recentCountries.length > 0)) && (
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Todos os países
            </div>
          )}
          {filtered.map(c => (
            <CountryRow
              key={c.code}
              country={c}
              selected={value === c.code}
              isFavorite={favorites.includes(c.code)}
              onSelect={handleSelect}
              onToggleFav={toggleFavorite}
            />
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum país encontrado.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CountryRow({
  country, selected, isFavorite, onSelect, onToggleFav,
}: {
  country: Country;
  selected: boolean;
  isFavorite: boolean;
  onSelect: (c: Country) => void;
  onToggleFav: (code: string, e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={() => onSelect(country)}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
        selected
          ? 'bg-primary/10 text-foreground'
          : 'hover:bg-secondary text-foreground/80 hover:text-foreground'
      }`}
    >
      <span className="text-base flex-shrink-0">{country.flag}</span>
      <span className="flex-1 text-left truncate">{country.name}</span>
      <span className="text-[11px] text-muted-foreground flex-shrink-0">{country.currency}</span>
      <button
        onClick={(e) => onToggleFav(country.code, e)}
        className="flex-shrink-0 p-0.5 hover:text-primary transition-colors"
      >
        {isFavorite ? (
          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
        ) : (
          <StarOff className="w-3.5 h-3.5 text-muted-foreground/40" />
        )}
      </button>
    </button>
  );
}
