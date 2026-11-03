import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  getPublicTutorCatalog, getDemoSnapshot, sendDemoCommand, isApiConfigured,
  type DemoSnapshot,
} from './src/api';
import { DEMO_CATALOG } from './src/demo-catalog';
import LabAccounts from './src/LabAccounts';
import type { CatalogSnapshot, PublicTutor } from './src/catalog';

type Tab = 'catalogo' | 'agenda' | 'progreso' | 'cuentas';
const NAV: { id: Tab; label: string }[] = [
  { id: 'catalogo', label: 'Explorar' }, { id: 'agenda', label: 'Mis clases' },
  { id: 'progreso', label: 'Progreso' }, { id: 'cuentas', label: 'Cuentas' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('catalogo');
  const [search, setSearch] = useState('');
  const [catalog, setCatalog] = useState<CatalogSnapshot>(DEMO_CATALOG);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceMessage, setServiceMessage] = useState('');
  const [demoSnapshot, setDemoSnapshot] = useState<DemoSnapshot | null>(null);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    if (!isApiConfigured()) {
      setCatalog(DEMO_CATALOG);
      setDemoSnapshot(null);
      setServiceMessage('Sin API configurada: los perfiles son ficticios y las reservas están deshabilitadas.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await getPublicTutorCatalog();
      setCatalog(response);
      setDemoSnapshot(response.source === 'demo' ? await getDemoSnapshot() : null);
      setServiceMessage('');
    } catch {
      // No presentar resultados ficticios como datos vivos del servidor.
      setCatalog({ items: [], revision: 0, source: 'server' });
      setDemoSnapshot(null);
      setServiceMessage('El servicio no responde. No se muestran docentes ni disponibilidad sin verificar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!isApiConfigured()) return;
    const timer = setInterval(() => {
      if (working) return;
      void getDemoSnapshot().then((next) => {
        setDemoSnapshot(previous => !previous || next.revision >= previous.revision ? next : previous);
      }).catch(() => {
        setDemoSnapshot(null);
        setServiceMessage('No hay conexión con el servidor local de pruebas.');
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [working]);

  const demoCommand = async (path: string, payload: Record<string, unknown>) => {
    if (!demoSnapshot || working) return;
    setWorking(true);
    try {
      await sendDemoCommand(path, demoSnapshot.revision, payload);
      setDemoSnapshot(await getDemoSnapshot());
      setServiceMessage('Operación ficticia guardada. La web y la app consultan la misma base local.');
    } catch (error) {
      setServiceMessage(error instanceof Error ? error.message : 'Operación de prueba no disponible.');
      try { setDemoSnapshot(await getDemoSnapshot()); } catch { setDemoSnapshot(null); }
    } finally { setWorking(false); }
  };

  const createDemoBooking = (tutor: PublicTutor) => {
    // Sólo reservas ficticias para mayores de edad. No representa disponibilidad validada.
    const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    void demoCommand('/v1/demo/bookings', {
      tutorId: tutor.id, subject: tutor.subjects[0] || 'Tutoría de prueba',
      mode: tutor.modes[0], startsAt,
    });
  };

  const visibleTutors = useMemo(() => catalog.items.filter((tutor) =>
    [tutor.name, tutor.specialty, ...tutor.subjects].join(' ').toLocaleLowerCase('es')
      .includes(search.trim().toLocaleLowerCase('es'))), [catalog.items, search]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CTG ONE · EDUCACIÓN</Text>
        <Text style={styles.brand}>Valderrama{'\n'}Learning Center</Text>
        <Text style={styles.tagline}>Aprendizaje humano. Conexiones responsables.</Text>
      </View>
      <View style={styles.warning} accessibilityRole="alert">
        <Text style={styles.warningTitle}>VERSIÓN PREOPERATIVA</Text>
        <Text style={styles.warningText}>{serviceMessage || 'Catálogo público conectado. Reservas, cuentas y pagos aún no están habilitados.'}</Text>
      </View>
      <View style={styles.nav}>
        {NAV.map((item) => (
          <Pressable key={item.id} onPress={() => setTab(item.id)}
            accessibilityRole="tab" accessibilityState={{ selected: tab === item.id }}
            style={[styles.navItem, tab === item.id && styles.navItemActive]}>
            <Text style={[styles.navText, tab === item.id && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollBody}>
        {tab === 'cuentas' ? <LabAccounts /> : tab === 'catalogo' ? (
          <>
            <Text style={styles.heading}>Encuentra a tu profesor</Text>
            <Text style={styles.secondary}>Colegio, universidad y aprendizaje a lo largo de la vida.</Text>
            <TextInput style={styles.input} value={search} onChangeText={setSearch}
              placeholder="Materia, especialidad o nombre" autoCapitalize="none"
              accessibilityLabel="Buscar docentes" />
            <Pressable onPress={() => { void refresh(); }} style={styles.refresh} disabled={isLoading}
              accessibilityRole="button">
              <Text style={styles.refreshText}>{isLoading ? 'Consultando catálogo…' : 'Actualizar catálogo'}</Text>
            </Pressable>
            {isLoading ? <ActivityIndicator color="#143e5b" /> : null}
            <Text style={styles.resultCount}>{visibleTutors.length} perfiles · {catalog.source === 'demo' ? 'DEMOSTRACIÓN' : 'API pública'} · revisión {catalog.revision}</Text>
            {visibleTutors.map((tutor: PublicTutor) => (
              <View key={tutor.id} style={styles.card}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{tutor.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</Text></View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{tutor.name}</Text>
                  <Text style={styles.cardSubtitle}>{tutor.specialty}</Text>
                  <Text style={styles.cardMeta}>{tutor.levels.join(' · ')}</Text>
                  <Text style={styles.cardMeta}>Modalidad: {tutor.modes.join(' / ')}</Text>
                  <Text style={styles.cardFootnote}>Sólo simulación local. Sin identidades ni clases reales.</Text>
                  {catalog.source === 'demo' && demoSnapshot ? (
                    <Pressable style={styles.demoAction} disabled={working} accessibilityRole="button"
                      onPress={() => createDemoBooking(tutor)}>
                      <Text style={styles.demoActionText}>Solicitar clase ficticia (+48 h)</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
            {!isLoading && visibleTutors.length === 0 ? <Text style={styles.empty}>No hay resultados disponibles.</Text> : null}
          </>
        ) : tab === 'agenda' && demoSnapshot ? (
          <View style={styles.infoCard}>
            <Text style={styles.heading}>Agenda sincronizada · simulación</Text>
            <Text style={styles.secondary}>Revisión {demoSnapshot.revision} · Los mismos datos ficticios aparecen en la web local al sincronizar.</Text>
            {demoSnapshot.bookings.length === 0 ? <Text style={styles.empty}>Sin reservas ficticias. Cree una en Explorar.</Text> : null}
            {demoSnapshot.bookings.slice().reverse().map(booking => {
              const tutor = catalog.items.find(item => item.id === booking.tutorId);
              const commands: Array<{label:string;path:string;payload:Record<string,unknown>}> = [];
              const prefix='/v1/demo/bookings/'+booking.id+'/';
              if (booking.status === 'pending') commands.push({
                label:'Simular aceptación del tutor',path:prefix+'decision',payload:{decision:'accept'},
              });
              if (booking.status === 'confirmed') commands.push({
                label:'Simular fin de la clase',path:prefix+'complete',payload:{},
              });
              if (['pending','confirmed'].includes(booking.status)) commands.push({
                label:'Reprogramar +2 días',path:prefix+'reschedule',
                payload:{startsAt:new Date(new Date(booking.startsAt).getTime()+2*86400000).toISOString()},
              });
              if (['pending','confirmed','completed'].includes(booking.status)) commands.push({
                label:'Reportar alerta ficticia',path:prefix+'incident',payload:{category:'safeguarding'},
              });
              return (
                <View key={booking.id} style={styles.cardStack}>
                  <Text style={styles.cardTitle}>{tutor?.name || 'Tutor ficticio'} · {booking.subject}</Text>
                  <Text style={styles.cardMeta}>{new Date(booking.startsAt).toLocaleString('es-CO')} · {booking.status}</Text>
                  {commands.map(command => (
                    <Pressable key={command.path} accessibilityRole="button" style={styles.demoAction}
                      disabled={working} onPress={() => { void demoCommand(command.path,command.payload); }}>
                      <Text style={styles.demoActionText}>{command.label}</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.heading}>{tab === 'agenda' ? 'Agenda de clases' : 'Seguimiento académico'}</Text>
            <Text style={styles.secondary}>{tab === 'agenda'
              ? 'Aquí se mostrarán las reservas, reprogramaciones y clases completadas de la cuenta autenticada.'
              : 'Aquí aparecerán objetivos de aprendizaje, asistencias, evidencias e informes académicos.'}</Text>
            <Text style={styles.empty}>Acceso aún no habilitado. No se almacenan datos personales en esta demostración.</Text>
          </View>
        )}
      </ScrollView>
      <Text style={styles.footer}>Android + iOS · API única · Diseño orientado a protección de menores</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#102f48', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  eyebrow: { fontSize: 11, fontWeight: '800', color: '#9fc8d4', letterSpacing: 2, marginBottom: 9 },
  brand: { fontSize: 30, lineHeight: 33, fontWeight: '800', color: '#fff' },
  tagline: { color: '#d3e1eb', marginTop: 8, fontSize: 12 },
  warning: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff1d6', borderBottomWidth: 1, borderBottomColor: '#ead9b5' },
  warningTitle: { color: '#7d570d', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  warningText: { color: '#664a18', marginTop: 4, lineHeight: 18, fontSize: 12 },
  nav: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 8 },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 9, backgroundColor: '#f0f4f8' },
  navItemActive: { backgroundColor: '#102f48' },
  navText: { color: '#596b78', fontSize: 11, fontWeight: '700' },
  navTextActive: { color: '#fff' },
  body: { flex: 1 },
  scrollBody: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 22, fontWeight: '800', color: '#12354d' },
  secondary: { fontSize: 13, color: '#5d7381', lineHeight: 21, marginTop: 7, marginBottom: 18 },
  input: { borderWidth: 1, borderColor: '#d3dce4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', color: '#1b2a35' },
  refresh: { alignSelf: 'flex-start', marginTop: 13, marginBottom: 18, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#d9e8f1' },
  refreshText: { color: '#164663', fontWeight: '700', fontSize: 12 },
  resultCount: { color: '#70838e', fontSize: 11, marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#e4eaf0' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dce8f2', justifyContent: 'center', alignItems: 'center', marginRight: 13 },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#143e5b' },
  cardContent: { flex: 1 },
  cardTitle: { fontWeight: '800', fontSize: 15, color: '#112f44' },
  cardSubtitle: { fontSize: 12, fontWeight: '600', color: '#42657e', marginTop: 4, marginBottom: 8 },
  cardMeta: { fontSize: 11, color: '#627a8b', marginTop: 3 },
  cardFootnote: { fontSize: 11, lineHeight: 16, color: '#9a7532', marginTop: 11 },
  empty: { fontSize: 13, color: '#7b8d98', lineHeight: 20, paddingVertical: 16 },
  infoCard: { padding: 20, borderWidth: 1, borderColor: '#e4eaf0', borderRadius: 14, backgroundColor: '#fff' },
  demoAction: { marginTop: 12, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 9, backgroundColor: '#d9e8f1' },
  demoActionText: { fontSize: 12, color: '#15435b', fontWeight: '800' },
  cardStack: { padding: 14, backgroundColor: '#f1f6f9', borderRadius: 12, marginBottom: 10 },
  footer: { textAlign: 'center', fontSize: 10, color: '#52697a', paddingVertical: 14, paddingHorizontal: 12, backgroundColor: '#fff' },
});
