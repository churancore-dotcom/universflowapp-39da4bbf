import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  Database,
  Music,
  Users,
  ListMusic,
  Disc,
  Loader2,
  CheckCircle2,
  Archive,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getDatabaseError } from '@/lib/errorMessages';

interface ExportOption {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  table: string;
  color: string;
}

const exportOptions: ExportOption[] = [
  { id: 'songs', name: 'Songs', icon: Music, description: 'All songs with metadata', table: 'songs', color: 'from-primary to-cyan-400' },
  { id: 'playlists', name: 'Playlists', icon: ListMusic, description: 'Playlists and their songs', table: 'playlists', color: 'from-accent to-pink-400' },
  { id: 'albums', name: 'Albums', icon: Disc, description: 'Album information', table: 'albums', color: 'from-purple-500 to-violet-400' },
  { id: 'artists', name: 'Artists', icon: Users, description: 'Artist profiles', table: 'artists', color: 'from-orange-500 to-amber-400' },
  { id: 'users', name: 'User Profiles', icon: Users, description: 'User account data', table: 'profiles', color: 'from-green-500 to-emerald-400' },
];

const BackupExport = () => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['songs', 'playlists', 'albums', 'artists']));
  const [lastExport, setLastExport] = useState<Date | null>(null);

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const exportSingle = async (option: ExportOption, format: 'json' | 'csv') => {
    setExporting(option.id);
    
    try {
      const { data, error } = await supabase
        .from(option.table as any)
        .select('*');

      if (error) throw error;

      if (format === 'json') {
        downloadFile(
          new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
          `${option.id}-export-${new Date().toISOString().split('T')[0]}.json`
        );
      } else {
        const csv = convertToCsv(data || []);
        downloadFile(
          new Blob([csv], { type: 'text/csv' }),
          `${option.id}-export-${new Date().toISOString().split('T')[0]}.csv`
        );
      }

      toast.success(`Exported ${option.name} successfully`);
      setLastExport(new Date());
    } catch (error) {
      toast.error(`Failed to export ${option.name}: ${getDatabaseError(error)}`);
    } finally {
      setExporting(null);
    }
  };

  const exportAll = async (format: 'json' | 'csv') => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one data type to export');
      return;
    }

    setExporting('all');
    const exportData: Record<string, any[]> = {};
    
    try {
      for (const option of exportOptions) {
        if (selectedItems.has(option.id)) {
          const { data, error } = await supabase
            .from(option.table as any)
            .select('*');

          if (!error && data) {
            exportData[option.id] = data;
          }
        }
      }

      if (format === 'json') {
        downloadFile(
          new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }),
          `full-backup-${new Date().toISOString().split('T')[0]}.json`
        );
      } else {
        // For CSV, create a zip-like structure by concatenating
        let allCsv = '';
        for (const [key, data] of Object.entries(exportData)) {
          allCsv += `\n\n=== ${key.toUpperCase()} ===\n`;
          allCsv += convertToCsv(data);
        }
        downloadFile(
          new Blob([allCsv], { type: 'text/csv' }),
          `full-backup-${new Date().toISOString().split('T')[0]}.csv`
        );
      }

      toast.success(`Full backup created with ${selectedItems.size} data types`);
      setLastExport(new Date());
    } catch (error) {
      toast.error(`Backup failed: ${getDatabaseError(error)}`);
    } finally {
      setExporting(null);
    }
  };

  const convertToCsv = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(h => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">Backup & Export</h1>
        <p className="text-muted-foreground mt-1">Download your platform data</p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="glass rounded-xl p-4 mb-8 flex items-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Archive className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">Full Backup</h3>
          <p className="text-sm text-muted-foreground">
            {lastExport 
              ? `Last export: ${lastExport.toLocaleString()}`
              : 'No recent exports'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => exportAll('json')} 
            disabled={exporting !== null}
            className="gap-2"
            variant="outline"
          >
            {exporting === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            JSON
          </Button>
          <Button 
            onClick={() => exportAll('csv')} 
            disabled={exporting !== null}
            className="gap-2 btn-premium"
          >
            {exporting === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            CSV
          </Button>
        </div>
      </motion.div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((option, index) => {
          const Icon = option.icon;
          const isSelected = selectedItems.has(option.id);
          const isExporting = exporting === option.id;
          
          return (
            <motion.div
              key={option.id}
              className={`glass rounded-xl p-4 transition-all ${isSelected ? 'ring-2 ring-primary/50' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleItem(option.id)}
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Icon className="w-6 h-6 text-white" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{option.name}</h3>
                    {isSelected && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => exportSingle(option, 'json')}
                      disabled={exporting !== null}
                      className="gap-1.5 h-8"
                    >
                      {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileJson className="w-3 h-3" />}
                      JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => exportSingle(option, 'csv')}
                      disabled={exporting !== null}
                      className="gap-1.5 h-8"
                    >
                      {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                      CSV
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info */}
      <motion.div
        className="glass rounded-xl p-4 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Export Information
        </h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• JSON format is best for backups and data restoration</li>
          <li>• CSV format is ideal for spreadsheet analysis</li>
          <li>• Select multiple items to include them in a full backup</li>
          <li>• Audio and cover files are not included in exports (only URLs)</li>
          <li>• Exports are downloaded directly to your device</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default BackupExport;
