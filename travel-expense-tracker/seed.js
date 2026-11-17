/* Seed data for the Dec 2026 road trip.
 * Everything here is editable in the app. No personal data (names, addresses,
 * phone numbers) belongs in this file: the repo is public.
 * Bilingual text is stored as { en, es }; once you edit a field in the app it
 * becomes plain text in whatever language you typed.
 * Distances are stored in miles (canonical). Times are local "HH:MM".
 */
window.SEED = (function () {
  const Q = (s) => s; // plain Google Maps search query

  const days = [
    {
      date: '2026-12-12',
      from: 'Grants Pass, OR', to: 'Bakersfield, CA',
      fromLat: 42.4390, fromLng: -123.3284, toLat: 35.3733, toLng: -119.0187,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Los_Angeles',
      distanceMi: 545, distanceNote: '~545 mi',
      driveHours: '~8.5 h', start: '06:00', arrive: '15:30',
      route: 'I-5 S',
      notes: { en: '', es: '' },
      fuelStops: [
        { en: 'Fill up in Grants Pass (cheaper than CA).', es: 'Llenar el tanque en Grants Pass (más barato que CA).' },
        { en: 'Refuel at Williams / Dunnigan, CA (~290 mi).', es: 'Recargar en Williams / Dunnigan, CA (~290 mi).' },
      ],
      fuelSearch: [Q('gas station Grants Pass OR'), Q("Love's Travel Stop near Williams CA"), Q('Pilot Flying J near Dunnigan CA')],
      foodSearch: [Q('rest area I-5 near Redding CA'), Q('restaurants near Williams CA I-5'), Q('rest area I-5 near Buttonwillow CA')],
      overnightSearch: [Q('hotels near I-5 Bakersfield CA'), Q('Hampton Inn Bakersfield'), Q('Holiday Inn Express Bakersfield')],
    },
    {
      date: '2026-12-13',
      from: 'Bakersfield, CA', to: 'Phoenix, AZ (Chandler/Tempe)',
      fromLat: 35.3733, fromLng: -119.0187, toLat: 33.3062, toLng: -111.8413,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Phoenix',
      distanceMi: 490, distanceNote: '~490 mi',
      driveHours: '~7.5 h', start: '06:00', arrive: '15:30',
      route: 'I-5 S (Grapevine), I-210 E, I-10 E',
      tzNote: { en: 'Clocks +1 h at the Arizona line (Arizona MST, no DST).', es: 'Reloj +1 h al entrar a Arizona (MST, sin horario de verano).' },
      notes: { en: '', es: '' },
      fuelStops: [
        { en: 'Buy only what you need in CA.', es: 'En CA cargar solo lo necesario.' },
        { en: 'Refuel at Blythe / Quartzsite at the AZ line.', es: 'Recargar en Blythe / Quartzsite en la línea con AZ.' },
      ],
      fuelSearch: [Q("Love's Travel Stop near Quartzsite AZ"), Q('Pilot Flying J near Blythe CA'), Q('TA Travel Center near Tonopah AZ')],
      foodSearch: [Q('restaurants near Banning CA I-10'), Q('rest area I-10 near Chiriaco Summit CA'), Q('restaurants near Quartzsite AZ')],
      overnightSearch: [Q('hotels near I-10 Chandler AZ'), Q('Holiday Inn Express Chandler AZ'), Q('Hampton Inn Tempe AZ')],
    },
    {
      date: '2026-12-14',
      from: 'Phoenix, AZ', to: 'El Paso, TX',
      fromLat: 33.3062, fromLng: -111.8413, toLat: 31.7619, toLng: -106.4850,
      country: 'US', startTz: 'America/Phoenix', arriveTz: 'America/Denver',
      distanceMi: 430, distanceNote: '~430 mi',
      driveHours: '~6.5 h', start: '06:00', arrive: '14:00',
      route: 'I-10 E',
      notes: { en: 'Short rest day.', es: 'Día corto de descanso.' },
      fuelStops: [
        { en: 'Fill up in Phoenix.', es: 'Llenar el tanque en Phoenix.' },
        { en: 'Refuel at Lordsburg or Deming, NM.', es: 'Recargar en Lordsburg o Deming, NM.' },
      ],
      fuelSearch: [Q("Love's Travel Stop near Lordsburg NM"), Q('Pilot Flying J near Deming NM'), Q('TA Travel Center near Willcox AZ')],
      foodSearch: [Q('restaurants near Benson AZ I-10'), Q('restaurants near Willcox AZ'), Q('restaurants near Deming NM')],
      overnightSearch: [Q('hotels near I-10 El Paso TX'), Q('Hampton Inn El Paso'), Q('Holiday Inn Express El Paso')],
    },
    {
      date: '2026-12-15',
      from: 'El Paso, TX', to: 'San Antonio, TX',
      fromLat: 31.7619, fromLng: -106.4850, toLat: 29.4241, toLng: -98.4936,
      country: 'US', startTz: 'America/Denver', arriveTz: 'America/Chicago',
      distanceMi: 550, distanceNote: '~550 mi',
      driveHours: '~8 h', start: '06:00', arrive: '16:30',
      route: 'I-10 E',
      tzNote: { en: 'Clocks +1 h east of Van Horn, TX (Central time).', es: 'Reloj +1 h al este de Van Horn, TX (hora del Centro).' },
      notes: { en: 'Border Patrol checkpoint on I-10 near Sierra Blanca.', es: 'Revisión de la Patrulla Fronteriza en la I-10 cerca de Sierra Blanca.' },
      fuelStops: [
        { en: 'Fill up in El Paso.', es: 'Llenar el tanque en El Paso.' },
        { en: 'Refuel at Fort Stockton, then Junction or Kerrville as needed.', es: 'Recargar en Fort Stockton, luego Junction o Kerrville si hace falta.' },
      ],
      fuelSearch: [Q('Pilot Flying J near Fort Stockton TX'), Q("Love's Travel Stop near Van Horn TX"), Q('gas station near Junction TX')],
      foodSearch: [Q('restaurants near Van Horn TX'), Q('restaurants near Fort Stockton TX'), Q('restaurants near Junction TX')],
      overnightSearch: [Q('hotels near I-10 San Antonio TX'), Q('Hampton Inn San Antonio I-10'), Q('Holiday Inn Express San Antonio')],
    },
    {
      date: '2026-12-16',
      from: 'San Antonio, TX', to: 'Saltillo, Coahuila',
      fromLat: 29.4241, fromLng: -98.4936, toLat: 25.4232, toLng: -101.0053,
      country: 'BORDER', startTz: 'America/Chicago', arriveTz: 'America/Monterrey',
      distanceMi: 352, distanceNote: '~175 mi US + ~285 km MX',
      driveHours: '~6 h + 0.5–1 h border', start: '06:00', arrive: '14:00',
      route: 'I-35 S, Mines Rd (FM 1472) to Puente Internacional Colombia (enters Nuevo León, avoids Tamaulipas), toll roads to Monterrey bypass, 40D to Saltillo',
      routeVia: 'Puente Internacional Colombia, Nuevo León',
      notes: { en: 'Border crossing day.', es: 'Día de cruce fronterizo.' },
      fuelStops: [
        { en: 'Fill up in San Antonio; top off in Laredo before crossing.', es: 'Llenar en San Antonio; completar en Laredo antes de cruzar.' },
        { en: 'Refuel in Saltillo.', es: 'Recargar en Saltillo.' },
      ],
      fuelSearch: [Q("Love's Travel Stop near Laredo TX"), Q('Pilot Flying J near Laredo TX'), Q('Pemex Saltillo'), Q('OXXO Gas Saltillo')],
      foodSearch: [Q('restaurants near Cotulla TX I-35'), Q('restaurants near Laredo TX I-35'), Q('VIPS Saltillo')],
      overnightSearch: [Q('hotel con estacionamiento vigilado Saltillo'), Q('Fiesta Inn Saltillo'), Q('City Express Saltillo'), Q('Holiday Inn Express Saltillo')],
    },
    {
      date: '2026-12-17',
      from: 'Saltillo, Coahuila', to: 'Celaya, Guanajuato',
      fromLat: 25.4232, fromLng: -101.0053, toLat: 20.5235, toLng: -100.8157,
      country: 'MX', startTz: 'America/Monterrey', arriveTz: 'America/Mexico_City',
      distanceMi: 438, distanceNote: '~705 km',
      driveHours: '~7.5 h', start: '07:15', arrive: '16:00',
      route: 'Hwy 57 / 57D, 45D (Saltillo – Matehuala – San Luis Potosí – Querétaro – Celaya)',
      routeVia: 'Matehuala, San Luis Potosí|Querétaro, Querétaro',
      notes: { en: 'Fallback overnight: San Luis Potosí (~450 km).', es: 'Plan B para dormir: San Luis Potosí (~450 km).' },
      fuelStops: [
        { en: 'Fill up in Saltillo.', es: 'Llenar el tanque en Saltillo.' },
        { en: 'Refuel at Matehuala, then San Luis Potosí or Querétaro.', es: 'Recargar en Matehuala, luego San Luis Potosí o Querétaro.' },
      ],
      fuelSearch: [Q('OXXO Gas Matehuala'), Q('Pemex Matehuala'), Q('Pemex San Luis Potosí carretera 57'), Q('OXXO Gas Querétaro')],
      foodSearch: [Q('VIPS Matehuala'), Q('Sanborns San Luis Potosí'), Q('Toks Querétaro')],
      overnightSearch: [Q('City Express Celaya'), Q('Fiesta Inn Celaya'), Q('hotel con estacionamiento vigilado Celaya'), Q('Fiesta Inn San Luis Potosí')],
    },
  ];

  // Notes shown on the evening before each day (index matches days[]).
  const tomorrow = [
    [ // before Day 1 (Fri Dec 11)
      { en: 'Check ODOT TripCheck and Caltrans QuickMap for snow and chain controls on Siskiyou Pass / Mt. Shasta (I-5). Carry chains.', es: 'Revisar ODOT TripCheck y Caltrans QuickMap por nieve y control de cadenas en Siskiyou Pass / Mt. Shasta (I-5). Llevar cadenas.' },
      { en: 'Fill the tank in Grants Pass tonight.', es: 'Llenar el tanque en Grants Pass esta noche.' },
      { en: 'Download Google Maps offline areas for the whole route.', es: 'Descargar las zonas sin conexión de Google Maps para toda la ruta.' },
      { en: 'Confirm TIP and Mexican insurance start dates.', es: 'Confirmar fechas de inicio del permiso (TIP) y del seguro mexicano.' },
      { en: 'Notify bank and cards of Mexico travel.', es: 'Avisar al banco y tarjetas del viaje a México.' },
      { en: 'Get USD cash and some MXN.', es: 'Tener efectivo en USD y algo de MXN.' },
      { en: 'Confirm hotel bookings.', es: 'Confirmar reservaciones de hotel.' },
    ],
    [ // before Day 2
      { en: 'Check Caltrans for Grapevine (I-5 Tejon Pass) closures from snow or wind.', es: 'Revisar Caltrans por cierres en el Grapevine (I-5 Tejon Pass) por nieve o viento.' },
      { en: 'Leave at 6 AM to clear LA on Sunday morning.', es: 'Salir a las 6 AM para pasar LA el domingo temprano.' },
      { en: 'Clocks move +1 h in Arizona.', es: 'El reloj se adelanta +1 h en Arizona.' },
      { en: 'CA gas is expensive: buy only enough to reach Blythe/Quartzsite.', es: 'La gasolina en CA es cara: cargar solo lo necesario para llegar a Blythe/Quartzsite.' },
    ],
    [ // before Day 3
      { en: 'Short day. Check AZ511 and NMRoads for wind or dust storm warnings on I-10.', es: 'Día corto. Revisar AZ511 y NMRoads por alertas de viento o tormentas de polvo en la I-10.' },
      { en: 'Vehicle check: tires, oil, wipers, washer fluid. Laundry.', es: 'Revisión del vehículo: llantas, aceite, limpiadores, líquido. Lavar ropa.' },
    ],
    [ // before Day 4
      { en: 'Longest US day. Clocks move +1 h after Van Horn, TX.', es: 'El día más largo en EE. UU. El reloj se adelanta +1 h después de Van Horn, TX.' },
      { en: 'Services are far apart in West Texas: refuel by the 300 mi rule.', es: 'Los servicios están muy separados en el oeste de Texas: recargar con la regla de 300 mi.' },
      { en: 'Have IDs ready for the Border Patrol checkpoint on I-10 near Sierra Blanca.', es: 'Tener identificaciones listas para la revisión de la Patrulla Fronteriza en la I-10 cerca de Sierra Blanca.' },
    ],
    [ // before Day 5 (border day)
      { en: 'Verify Puente Colombia hours today.', es: 'Verificar hoy el horario del Puente Colombia.' },
      { en: 'Have ready: passports, license, registration/title, TIP printout, Mexican insurance, USD cash for the bridge, MXN for casetas.', es: 'Tener listo: pasaportes, licencia, tarjeta de circulación/título, TIP impreso, seguro mexicano, USD en efectivo para el puente, MXN para casetas.' },
      { en: 'Fill the tank in Laredo.', es: 'Llenar el tanque en Laredo.' },
      { en: 'Refresh Google Maps offline areas on hotel Wi-Fi.', es: 'Actualizar las zonas sin conexión de Google Maps con el Wi-Fi del hotel.' },
      { en: 'Confirm the Saltillo hotel has secure parking.', es: 'Confirmar que el hotel en Saltillo tenga estacionamiento seguro.' },
      { en: "Share the day's plan with family.", es: 'Compartir el plan del día con la familia.' },
      { en: 'Nothing visible in the car.', es: 'Nada a la vista dentro del carro.' },
    ],
    [ // before Day 6
      { en: 'Leave at sunrise (~7:15 AM), not earlier.', es: 'Salir al amanecer (~7:15 AM), no antes.' },
      { en: 'Leave Saltillo with a full tank: the stretch to Matehuala is long desert with few services.', es: 'Salir de Saltillo con tanque lleno: el tramo a Matehuala es desierto largo con pocos servicios.' },
      { en: 'Expect fog on the high plains early and heavy trucks on 57D.', es: 'Esperar neblina temprano en el altiplano y mucho tráiler en la 57D.' },
      { en: 'If delayed, overnight in San Luis Potosí.', es: 'Si hay retraso, dormir en San Luis Potosí.' },
      { en: 'Avoid Querétaro to Celaya rush hour.', es: 'Evitar la hora pico de Querétaro a Celaya.' },
      { en: 'Send the arrival message.', es: 'Enviar el mensaje de llegada.' },
    ],
  ];

  const expectedTolls = [
    { name: 'Puente Internacional Colombia', highway: 'Bridge', estAmount: null, currency: 'USD', kind: 'bridge', optional: false,
      note: { en: 'Bridge toll, USD cash.', es: 'Cuota del puente, efectivo en USD.' } },
    { name: 'Monterrey – Nuevo Laredo', highway: '85D', estAmount: 366, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'Only if used.', es: 'Solo si se usa.' } },
    { name: 'Monterrey – Saltillo', highway: '40D', estAmount: 150, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },
    { name: 'Saltillo – San Luis Potosí – Querétaro casetas', highway: '57D', matchHighway: '57', estAmount: null, currency: 'MXN', kind: 'toll', optional: false,
      note: { en: 'Enter each caseta name as you pass it (highway 57/57D).', es: 'Anotar el nombre de cada caseta al pasarla (carretera 57/57D).' } },
    { name: 'Libramiento Noreste de Querétaro', highway: 'Libramiento NE', estAmount: 65, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'If used.', es: 'Si se usa.' } },
    { name: 'Querétaro – Celaya', highway: '45D', estAmount: 105, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },
  ];

  // Budget lines (editable). amount is the planned total for the trip, one way.
  const budget = [
    { cat: 'fuel', amount: 570, currency: 'USD', note: { en: '~$570 one way', es: '~$570 solo ida' } },
    { cat: 'toll', amount: 1400, currency: 'MXN', note: { en: 'Mexican tolls ~MX$1,400', es: 'Casetas en México ~MX$1,400' } },
    { cat: 'hotel', amount: 650, currency: 'USD', note: { en: '$100–130/night × 5 nights', es: '$100–130/noche × 5 noches' } },
    { cat: 'food', amount: 360, currency: 'USD', note: { en: '$40–60/day × 6 days', es: '$40–60/día × 6 días' } },
    { cat: 'bridge', amount: 0, currency: 'USD', note: { en: 'Bridge toll (cash)', es: 'Cuota del puente (efectivo)' } },
    { cat: 'permits', amount: 355, currency: 'USD', note: { en: 'TIP ~$55 + Mexican insurance $150–300', es: 'TIP ~$55 + seguro mexicano $150–300' } },
    { cat: 'other', amount: 0, currency: 'USD', note: { en: '', es: '' } },
  ];

  const docs = [
    { en: 'Passports (everyone)', es: 'Pasaportes (todos)' },
    { en: "Driver's license", es: 'Licencia de manejo' },
    { en: 'Vehicle registration / title', es: 'Tarjeta de circulación / título del vehículo' },
    { en: 'TIP (Banjercito, available online up to 60 days ahead)', es: 'Permiso de importación temporal TIP (Banjercito, en línea hasta 60 días antes)' },
    { en: 'Mexican auto insurance', es: 'Seguro de auto mexicano' },
    { en: 'USD cash', es: 'Efectivo en USD' },
    { en: 'MXN cash', es: 'Efectivo en MXN' },
    { en: 'TAG for tolls', es: 'TAG para casetas' },
    { en: 'Phone charger', es: 'Cargador de teléfono' },
    { en: 'Paper map', es: 'Mapa de papel' },
  ];

  return { days, tomorrow, expectedTolls, budget, docs };
})();
