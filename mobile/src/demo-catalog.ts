import type { CatalogSnapshot } from './catalog';

// Perfiles inventados para la demostración. No representan disponibilidad real.
export const DEMO_CATALOG: CatalogSnapshot = {
  source: 'demo',
  revision: 0,
  items: [
    { id: 'demo-01', name: 'Sofía Mendoza', specialty: 'Matemáticas y Física', subjects: ['Matemáticas', 'Física'], levels: ['Colegio', 'Universidad'], modes: ['Virtual'] },
    { id: 'demo-02', name: 'Andrés Castillo', specialty: 'Inglés y comunicación', subjects: ['Inglés', 'Idiomas'], levels: ['Colegio', 'Adultos'], modes: ['Virtual', 'Presencial'] },
    { id: 'demo-03', name: 'Valentina Ríos', specialty: 'Química y Biología', subjects: ['Química', 'Biología'], levels: ['Colegio', 'Universidad'], modes: ['Virtual', 'Presencial'] },
    { id: 'demo-04', name: 'Gabriel Torres', specialty: 'Programación y datos', subjects: ['Programación', 'Python'], levels: ['Universidad', 'Adultos'], modes: ['Virtual'] },
  ],
};
