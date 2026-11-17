/* Seed data for the Dec 2026 – Jan 2027 round trip.
 * Everything here is editable in the app. No personal data (names, addresses,
 * phone numbers) belongs in this file: the repo is public.
 *
 * Bilingual text is stored as { en, es }; once you edit a field in the app it
 * becomes plain text in whatever language you typed.
 * Distances are stored in miles (canonical). Times are local "HH:MM".
 * `key` values are stable IDs: the app uses them to merge seed updates into
 * data already saved on a phone without touching anything the user edited.
 * `stops` are towns along the day (approximate town-center coordinates) used
 * for the OpenStreetMap "real places" search.
 * Bump `version` whenever this file changes in a way existing phones should get.
 */
window.SEED = (function () {
  const version = 2;

  const S = (name, lat, lng, r) => ({ name, lat, lng, r: r || 8000 });
  const GP = S('Grants Pass, OR', 42.4390, -123.3284);
  const BAK = S('Bakersfield, CA', 35.3733, -119.0187, 7000);
  const PHX = S('Chandler / Tempe, AZ', 33.3062, -111.8413, 6000);
  const ELP = S('El Paso, TX', 31.7619, -106.4850, 7000);
  const SAT = S('San Antonio, TX', 29.4241, -98.4936, 7000);
  const SAL = S('Saltillo, Coah.', 25.4232, -101.0053, 6000);
  const CEL = S('Celaya, Gto.', 20.5235, -100.8157, 5000);
  const QRO = S('Querétaro, Qro.', 20.5888, -100.3899, 6000);
  const SLP = S('San Luis Potosí, SLP', 22.1565, -100.9855, 6000);
  const MAT = S('Matehuala, SLP', 23.6497, -100.6440);
  const LRD = S('Laredo, TX', 27.5306, -99.4803, 7000);

  const days = [
    {
      key: 'out1', leg: 'out', date: '2026-12-12',
      from: 'Grants Pass, OR', to: 'Bakersfield, CA',
      fromLat: 42.4390, fromLng: -123.3284, toLat: 35.3733, toLng: -119.0187,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Los_Angeles',
      distanceMi: 545, distanceNote: '~545 mi',
      driveHours: '~8.5 h', start: '06:00', arrive: '15:30',
      route: 'I-5 S',
      notes: { en: '', es: '' },
      stops: [GP, S('Redding, CA', 40.5865, -122.3917), S('Williams, CA', 39.1546, -122.1494), S('Dunnigan, CA', 38.8857, -121.9694), S('Buttonwillow, CA', 35.4005, -119.4696), BAK],
      fuelStops: [
        { en: 'Fill up in Grants Pass (cheaper than CA).', es: 'Llenar el tanque en Grants Pass (más barato que CA).' },
        { en: 'Refuel at Williams / Dunnigan, CA (~290 mi).', es: 'Recargar en Williams / Dunnigan, CA (~290 mi).' },
      ],
      fuelSearch: ['gas station Grants Pass OR', "Love's Travel Stop near Williams CA", 'Pilot Flying J near Dunnigan CA'],
      foodSearch: ['rest area I-5 near Redding CA', 'restaurants near Williams CA I-5', 'rest area I-5 near Buttonwillow CA'],
      overnightSearch: ['hotels near I-5 Bakersfield CA', 'Hampton Inn Bakersfield', 'Holiday Inn Express Bakersfield'],
    },
    {
      key: 'out2', leg: 'out', date: '2026-12-13',
      from: 'Bakersfield, CA', to: 'Phoenix, AZ (Chandler/Tempe)',
      fromLat: 35.3733, fromLng: -119.0187, toLat: 33.3062, toLng: -111.8413,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Phoenix',
      distanceMi: 490, distanceNote: '~490 mi',
      driveHours: '~7.5 h', start: '06:00', arrive: '15:30',
      route: 'I-5 S (Grapevine), I-210 E, I-10 E',
      tzNote: { en: 'Clocks +1 h at the Arizona line (Arizona MST, no DST).', es: 'Reloj +1 h al entrar a Arizona (MST, sin horario de verano).' },
      notes: { en: '', es: '' },
      stops: [BAK, S('Banning, CA', 33.9256, -116.8764), S('Chiriaco Summit, CA', 33.6614, -115.7219), S('Blythe, CA', 33.6103, -114.5964), S('Quartzsite, AZ', 33.6639, -114.2299), S('Tonopah, AZ', 33.4934, -112.9363), PHX],
      fuelStops: [
        { en: 'Buy only what you need in CA.', es: 'En CA cargar solo lo necesario.' },
        { en: 'Refuel at Blythe / Quartzsite at the AZ line.', es: 'Recargar en Blythe / Quartzsite en la línea con AZ.' },
      ],
      fuelSearch: ["Love's Travel Stop near Quartzsite AZ", 'Pilot Flying J near Blythe CA', 'TA Travel Center near Tonopah AZ'],
      foodSearch: ['restaurants near Banning CA I-10', 'rest area I-10 near Chiriaco Summit CA', 'restaurants near Quartzsite AZ'],
      overnightSearch: ['hotels near I-10 Chandler AZ', 'Holiday Inn Express Chandler AZ', 'Hampton Inn Tempe AZ'],
    },
    {
      key: 'out3', leg: 'out', date: '2026-12-14',
      from: 'Phoenix, AZ', to: 'El Paso, TX',
      fromLat: 33.3062, fromLng: -111.8413, toLat: 31.7619, toLng: -106.4850,
      country: 'US', startTz: 'America/Phoenix', arriveTz: 'America/Denver',
      distanceMi: 430, distanceNote: '~430 mi',
      driveHours: '~6.5 h', start: '06:00', arrive: '14:00',
      route: 'I-10 E',
      notes: { en: 'Short rest day.', es: 'Día corto de descanso.' },
      stops: [PHX, S('Benson, AZ', 31.9679, -110.2945), S('Willcox, AZ', 32.2529, -109.8320), S('Lordsburg, NM', 32.3504, -108.7087), S('Deming, NM', 32.2687, -107.7586), ELP],
      fuelStops: [
        { en: 'Fill up in Phoenix.', es: 'Llenar el tanque en Phoenix.' },
        { en: 'Refuel at Lordsburg or Deming, NM.', es: 'Recargar en Lordsburg o Deming, NM.' },
      ],
      fuelSearch: ["Love's Travel Stop near Lordsburg NM", 'Pilot Flying J near Deming NM', 'TA Travel Center near Willcox AZ'],
      foodSearch: ['restaurants near Benson AZ I-10', 'restaurants near Willcox AZ', 'restaurants near Deming NM'],
      overnightSearch: ['hotels near I-10 El Paso TX', 'Hampton Inn El Paso', 'Holiday Inn Express El Paso'],
    },
    {
      key: 'out4', leg: 'out', date: '2026-12-15',
      from: 'El Paso, TX', to: 'San Antonio, TX',
      fromLat: 31.7619, fromLng: -106.4850, toLat: 29.4241, toLng: -98.4936,
      country: 'US', startTz: 'America/Denver', arriveTz: 'America/Chicago',
      distanceMi: 550, distanceNote: '~550 mi',
      driveHours: '~8 h', start: '06:00', arrive: '16:30',
      route: 'I-10 E',
      tzNote: { en: 'Clocks +1 h east of Van Horn, TX (Central time).', es: 'Reloj +1 h al este de Van Horn, TX (hora del Centro).' },
      notes: { en: 'Border Patrol checkpoint on I-10 near Sierra Blanca.', es: 'Revisión de la Patrulla Fronteriza en la I-10 cerca de Sierra Blanca.' },
      stops: [ELP, S('Van Horn, TX', 31.0399, -104.8307), S('Fort Stockton, TX', 30.8940, -102.8793), S('Ozona, TX', 30.7110, -101.2006), S('Junction, TX', 30.4894, -99.7720), S('Kerrville, TX', 30.0474, -99.1403), SAT],
      fuelStops: [
        { en: 'Fill up in El Paso.', es: 'Llenar el tanque en El Paso.' },
        { en: 'Refuel at Fort Stockton, then Junction or Kerrville as needed.', es: 'Recargar en Fort Stockton, luego Junction o Kerrville si hace falta.' },
      ],
      fuelSearch: ['Pilot Flying J near Fort Stockton TX', "Love's Travel Stop near Van Horn TX", 'gas station near Junction TX'],
      foodSearch: ['restaurants near Van Horn TX', 'restaurants near Fort Stockton TX', 'restaurants near Junction TX'],
      overnightSearch: ['hotels near I-10 San Antonio TX', 'Hampton Inn San Antonio I-10', 'Holiday Inn Express San Antonio'],
    },
    {
      key: 'out5', leg: 'out', date: '2026-12-16',
      from: 'San Antonio, TX', to: 'Saltillo, Coahuila',
      fromLat: 29.4241, fromLng: -98.4936, toLat: 25.4232, toLng: -101.0053,
      country: 'BORDER', startTz: 'America/Chicago', arriveTz: 'America/Monterrey',
      distanceMi: 352, distanceNote: '~175 mi US + ~285 km MX',
      driveHours: '~6 h + 0.5–1 h border', start: '06:00', arrive: '14:00',
      route: 'I-35 S, Mines Rd (FM 1472) to Puente Internacional Colombia (enters Nuevo León, avoids Tamaulipas), toll roads to Monterrey bypass, 40D to Saltillo',
      routeVia: 'Puente Internacional Colombia, Nuevo León',
      notes: { en: 'Border crossing day.', es: 'Día de cruce fronterizo.' },
      stops: [SAT, S('Cotulla, TX', 28.4369, -99.2350), LRD, S('Monterrey, N.L.', 25.6866, -100.3161, 6000), SAL],
      fuelStops: [
        { en: 'Fill up in San Antonio; top off in Laredo before crossing.', es: 'Llenar en San Antonio; completar en Laredo antes de cruzar.' },
        { en: 'Refuel in Saltillo.', es: 'Recargar en Saltillo.' },
      ],
      fuelSearch: ["Love's Travel Stop near Laredo TX", 'Pilot Flying J near Laredo TX', 'Pemex Saltillo', 'OXXO Gas Saltillo'],
      foodSearch: ['restaurants near Cotulla TX I-35', 'restaurants near Laredo TX I-35', 'VIPS Saltillo'],
      overnightSearch: ['hotel con estacionamiento vigilado Saltillo', 'Fiesta Inn Saltillo', 'City Express Saltillo', 'Holiday Inn Express Saltillo'],
    },
    {
      key: 'out6', leg: 'out', date: '2026-12-17',
      from: 'Saltillo, Coahuila', to: 'Celaya, Guanajuato',
      fromLat: 25.4232, fromLng: -101.0053, toLat: 20.5235, toLng: -100.8157,
      country: 'MX', startTz: 'America/Monterrey', arriveTz: 'America/Mexico_City',
      distanceMi: 438, distanceNote: '~705 km',
      driveHours: '~7.5 h', start: '07:25', arrive: '16:00',
      route: 'Hwy 57 / 57D, 45D (Saltillo – Matehuala – San Luis Potosí – Querétaro – Celaya)',
      routeVia: 'Matehuala, San Luis Potosí|Querétaro, Querétaro',
      notes: { en: 'Fallback overnight: San Luis Potosí (~450 km). Last stretch Querétaro – Celaya on 45D (~45 km): fill up in Querétaro and drive it straight through in daylight, no stops.', es: 'Plan B para dormir: San Luis Potosí (~450 km). Último tramo Querétaro – Celaya por la 45D (~45 km): cargar gasolina en Querétaro y hacerlo de corrido, de día y sin paradas.' },
      stops: [SAL, MAT, SLP, QRO, CEL],
      fuelStops: [
        { en: 'Fill up in Saltillo.', es: 'Llenar el tanque en Saltillo.' },
        { en: 'Refuel at Matehuala, then San Luis Potosí or Querétaro.', es: 'Recargar en Matehuala, luego San Luis Potosí o Querétaro.' },
      ],
      fuelSearch: ['OXXO Gas Matehuala', 'Pemex Matehuala', 'Pemex San Luis Potosí carretera 57', 'OXXO Gas Querétaro'],
      foodSearch: ['VIPS Matehuala', 'Sanborns San Luis Potosí', 'Toks Querétaro'],
      overnightSearch: ['City Express Celaya', 'Fiesta Inn Celaya', 'hotel con estacionamiento vigilado Celaya', 'Fiesta Inn San Luis Potosí'],
    },

    // ── Return trip ──
    {
      key: 'ret1', leg: 'return', date: '2027-01-02',
      from: 'Celaya, Guanajuato', to: 'Saltillo, Coahuila',
      fromLat: 20.5235, fromLng: -100.8157, toLat: 25.4232, toLng: -101.0053,
      country: 'MX', startTz: 'America/Mexico_City', arriveTz: 'America/Monterrey',
      distanceMi: 438, distanceNote: '~705 km',
      driveHours: '~7.5 h', start: '07:30', arrive: '16:00',
      route: '45D to Querétaro, then 57D north (Querétaro – San Luis Potosí – Matehuala – Saltillo)',
      routeVia: 'Querétaro, Querétaro|San Luis Potosí, San Luis Potosí|Matehuala, San Luis Potosí',
      notes: { en: 'First stretch Celaya – Querétaro on 45D: leave at sunrise and drive it straight through, no stops. Fallback overnight: San Luis Potosí or Matehuala.', es: 'Primer tramo Celaya – Querétaro por la 45D: salir al amanecer y hacerlo de corrido, sin paradas. Plan B para dormir: San Luis Potosí o Matehuala.' },
      stops: [CEL, QRO, SLP, MAT, SAL],
      fuelStops: [
        { en: 'Fill up in Celaya the evening before.', es: 'Llenar el tanque en Celaya la noche anterior.' },
        { en: 'Refuel at San Luis Potosí, then Matehuala (last good services before the desert stretch).', es: 'Recargar en San Luis Potosí, luego Matehuala (últimos buenos servicios antes del desierto).' },
      ],
      fuelSearch: ['OXXO Gas Celaya', 'Pemex San Luis Potosí carretera 57', 'OXXO Gas Matehuala', 'Pemex Matehuala'],
      foodSearch: ['Toks Querétaro', 'Sanborns San Luis Potosí', 'VIPS Matehuala'],
      overnightSearch: ['hotel con estacionamiento vigilado Saltillo', 'Fiesta Inn Saltillo', 'City Express Saltillo', 'Fiesta Inn San Luis Potosí'],
    },
    {
      key: 'ret2', leg: 'return', date: '2027-01-03',
      from: 'Saltillo, Coahuila', to: 'San Antonio, TX',
      fromLat: 25.4232, fromLng: -101.0053, toLat: 29.4241, toLng: -98.4936,
      country: 'BORDER', startTz: 'America/Monterrey', arriveTz: 'America/Chicago',
      distanceMi: 352, distanceNote: '~285 km MX + ~175 mi US',
      driveHours: '~6 h + 1–2 h border', start: '07:35', arrive: '16:00',
      route: '40D Saltillo – Monterrey, Monterrey bypass, toll road to Puente Internacional Colombia, Mines Rd (FM 1472), I-35 N',
      routeVia: 'Puente Internacional Colombia, Nuevo León|Laredo, TX',
      notes: { en: 'Border day. Cancel the TIP at Banjercito at the bridge BEFORE crossing into the US, and keep the receipt.', es: 'Día de frontera. Cancelar el TIP en Banjercito en el puente ANTES de cruzar a EE. UU. y guardar el comprobante.' },
      stops: [SAL, S('Monterrey, N.L.', 25.6866, -100.3161, 6000), LRD, S('Cotulla, TX', 28.4369, -99.2350), SAT],
      fuelStops: [
        { en: 'Leave Saltillo with enough fuel to reach Laredo (no need to fill up near the border).', es: 'Salir de Saltillo con gasolina suficiente para llegar a Laredo (no hace falta cargar cerca de la frontera).' },
        { en: 'Fill up in Laredo, TX.', es: 'Llenar el tanque en Laredo, TX.' },
      ],
      fuelSearch: ['OXXO Gas Saltillo', "Love's Travel Stop near Laredo TX", 'Pilot Flying J near Laredo TX'],
      foodSearch: ['VIPS Saltillo', 'restaurants near Laredo TX I-35', 'restaurants near Cotulla TX I-35'],
      overnightSearch: ['hotels near I-10 San Antonio TX', 'Hampton Inn San Antonio I-10', 'Holiday Inn Express San Antonio'],
    },
    {
      key: 'ret3', leg: 'return', date: '2027-01-04',
      from: 'San Antonio, TX', to: 'El Paso, TX',
      fromLat: 29.4241, fromLng: -98.4936, toLat: 31.7619, toLng: -106.4850,
      country: 'US', startTz: 'America/Chicago', arriveTz: 'America/Denver',
      distanceMi: 550, distanceNote: '~550 mi',
      driveHours: '~8 h', start: '06:00', arrive: '14:30',
      route: 'I-10 W',
      tzNote: { en: 'Clocks −1 h west of Van Horn, TX (Mountain time).', es: 'Reloj −1 h al oeste de Van Horn, TX (hora de la Montaña).' },
      notes: { en: 'Longest US day. Border Patrol checkpoint on I-10 near Sierra Blanca.', es: 'El día más largo en EE. UU. Revisión de la Patrulla Fronteriza en la I-10 cerca de Sierra Blanca.' },
      stops: [SAT, S('Kerrville, TX', 30.0474, -99.1403), S('Junction, TX', 30.4894, -99.7720), S('Ozona, TX', 30.7110, -101.2006), S('Fort Stockton, TX', 30.8940, -102.8793), S('Van Horn, TX', 31.0399, -104.8307), ELP],
      fuelStops: [
        { en: 'Fill up in San Antonio.', es: 'Llenar el tanque en San Antonio.' },
        { en: 'Refuel at Junction or Ozona, then Fort Stockton (300 mi rule).', es: 'Recargar en Junction u Ozona, luego Fort Stockton (regla de 300 mi).' },
      ],
      fuelSearch: ['gas station near Junction TX', 'Pilot Flying J near Fort Stockton TX', "Love's Travel Stop near Van Horn TX"],
      foodSearch: ['restaurants near Junction TX', 'restaurants near Fort Stockton TX', 'restaurants near Van Horn TX'],
      overnightSearch: ['hotels near I-10 El Paso TX', 'Hampton Inn El Paso', 'Holiday Inn Express El Paso'],
    },
    {
      key: 'ret4', leg: 'return', date: '2027-01-05',
      from: 'El Paso, TX', to: 'Phoenix, AZ (Chandler/Tempe)',
      fromLat: 31.7619, fromLng: -106.4850, toLat: 33.3062, toLng: -111.8413,
      country: 'US', startTz: 'America/Denver', arriveTz: 'America/Phoenix',
      distanceMi: 430, distanceNote: '~430 mi',
      driveHours: '~6.5 h', start: '06:00', arrive: '13:30',
      route: 'I-10 W',
      notes: { en: 'Short rest day.', es: 'Día corto de descanso.' },
      stops: [ELP, S('Deming, NM', 32.2687, -107.7586), S('Lordsburg, NM', 32.3504, -108.7087), S('Willcox, AZ', 32.2529, -109.8320), S('Benson, AZ', 31.9679, -110.2945), PHX],
      fuelStops: [
        { en: 'Fill up in El Paso.', es: 'Llenar el tanque en El Paso.' },
        { en: 'Refuel at Deming or Lordsburg, NM.', es: 'Recargar en Deming o Lordsburg, NM.' },
      ],
      fuelSearch: ['Pilot Flying J near Deming NM', "Love's Travel Stop near Lordsburg NM", 'TA Travel Center near Willcox AZ'],
      foodSearch: ['restaurants near Deming NM', 'restaurants near Willcox AZ', 'restaurants near Benson AZ I-10'],
      overnightSearch: ['hotels near I-10 Chandler AZ', 'Holiday Inn Express Chandler AZ', 'Hampton Inn Tempe AZ'],
    },
    {
      key: 'ret5', leg: 'return', date: '2027-01-06',
      from: 'Phoenix, AZ', to: 'Bakersfield, CA',
      fromLat: 33.3062, fromLng: -111.8413, toLat: 35.3733, toLng: -119.0187,
      country: 'US', startTz: 'America/Phoenix', arriveTz: 'America/Los_Angeles',
      distanceMi: 490, distanceNote: '~490 mi',
      driveHours: '~7.5 h', start: '06:00', arrive: '13:30',
      route: 'I-10 W, I-210 W, I-5 N (Grapevine)',
      tzNote: { en: 'Clocks −1 h at the California line (Pacific time).', es: 'Reloj −1 h al entrar a California (hora del Pacífico).' },
      notes: { en: '', es: '' },
      stops: [PHX, S('Tonopah, AZ', 33.4934, -112.9363), S('Quartzsite, AZ', 33.6639, -114.2299), S('Blythe, CA', 33.6103, -114.5964), S('Chiriaco Summit, CA', 33.6614, -115.7219), S('Banning, CA', 33.9256, -116.8764), BAK],
      fuelStops: [
        { en: 'Fill up in Phoenix (cheaper than CA).', es: 'Llenar el tanque en Phoenix (más barato que CA).' },
        { en: 'Top off at Quartzsite, AZ before the California line.', es: 'Completar en Quartzsite, AZ antes de entrar a California.' },
      ],
      fuelSearch: ['TA Travel Center near Tonopah AZ', "Love's Travel Stop near Quartzsite AZ", 'Pilot Flying J near Blythe CA'],
      foodSearch: ['restaurants near Quartzsite AZ', 'rest area I-10 near Chiriaco Summit CA', 'restaurants near Banning CA I-10'],
      overnightSearch: ['hotels near I-5 Bakersfield CA', 'Hampton Inn Bakersfield', 'Holiday Inn Express Bakersfield'],
    },
    {
      key: 'ret6', leg: 'return', date: '2027-01-07',
      from: 'Bakersfield, CA', to: 'Grants Pass, OR',
      fromLat: 35.3733, fromLng: -119.0187, toLat: 42.4390, toLng: -123.3284,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Los_Angeles',
      distanceMi: 545, distanceNote: '~545 mi',
      driveHours: '~8.5 h', start: '06:00', arrive: '15:30',
      route: 'I-5 N',
      notes: { en: 'Home! Siskiyou Pass in January: check chain controls before leaving.', es: '¡A casa! Siskiyou Pass en enero: revisar control de cadenas antes de salir.' },
      stops: [BAK, S('Buttonwillow, CA', 35.4005, -119.4696), S('Dunnigan, CA', 38.8857, -121.9694), S('Williams, CA', 39.1546, -122.1494), S('Redding, CA', 40.5865, -122.3917), GP],
      fuelStops: [
        { en: 'Buy only what you need in CA.', es: 'En CA cargar solo lo necesario.' },
        { en: 'Refuel at Williams / Dunnigan, then Redding before the mountains.', es: 'Recargar en Williams / Dunnigan, luego Redding antes de la sierra.' },
      ],
      fuelSearch: ['Pilot Flying J near Dunnigan CA', "Love's Travel Stop near Williams CA", 'gas station Redding CA I-5'],
      foodSearch: ['rest area I-5 near Buttonwillow CA', 'restaurants near Williams CA I-5', 'restaurants near Redding CA I-5'],
      overnightSearch: [],
    },
  ];

  // Notes shown on the evening before each day (index matches days[]).
  const tomorrow = [
    [ // before out1 (Fri Dec 11)
      { en: 'Check ODOT TripCheck and Caltrans QuickMap for snow and chain controls on Siskiyou Pass / Mt. Shasta (I-5). Carry chains.', es: 'Revisar ODOT TripCheck y Caltrans QuickMap por nieve y control de cadenas en Siskiyou Pass / Mt. Shasta (I-5). Llevar cadenas.' },
      { en: 'Fill the tank in Grants Pass tonight.', es: 'Llenar el tanque en Grants Pass esta noche.' },
      { en: 'Download Google Maps offline areas for the whole route.', es: 'Descargar las zonas sin conexión de Google Maps para toda la ruta.' },
      { en: 'Confirm TIP and Mexican insurance start dates.', es: 'Confirmar fechas de inicio del permiso (TIP) y del seguro mexicano.' },
      { en: 'Notify bank and cards of Mexico travel.', es: 'Avisar al banco y tarjetas del viaje a México.' },
      { en: 'Get USD cash and some MXN.', es: 'Tener efectivo en USD y algo de MXN.' },
      { en: 'Confirm hotel bookings.', es: 'Confirmar reservaciones de hotel.' },
    ],
    [ // before out2
      { en: 'Check Caltrans for Grapevine (I-5 Tejon Pass) closures from snow or wind.', es: 'Revisar Caltrans por cierres en el Grapevine (I-5 Tejon Pass) por nieve o viento.' },
      { en: 'Leave at 6 AM to clear LA on Sunday morning.', es: 'Salir a las 6 AM para pasar LA el domingo temprano.' },
      { en: 'Clocks move +1 h in Arizona.', es: 'El reloj se adelanta +1 h en Arizona.' },
      { en: 'CA gas is expensive: buy only enough to reach Blythe/Quartzsite.', es: 'La gasolina en CA es cara: cargar solo lo necesario para llegar a Blythe/Quartzsite.' },
    ],
    [ // before out3
      { en: 'Short day. Check AZ511 and NMRoads for wind or dust storm warnings on I-10.', es: 'Día corto. Revisar AZ511 y NMRoads por alertas de viento o tormentas de polvo en la I-10.' },
      { en: 'Vehicle check: tires, oil, wipers, washer fluid. Laundry.', es: 'Revisión del vehículo: llantas, aceite, limpiadores, líquido. Lavar ropa.' },
    ],
    [ // before out4
      { en: 'Longest US day. Clocks move +1 h after Van Horn, TX.', es: 'El día más largo en EE. UU. El reloj se adelanta +1 h después de Van Horn, TX.' },
      { en: 'Services are far apart in West Texas: refuel by the 300 mi rule.', es: 'Los servicios están muy separados en el oeste de Texas: recargar con la regla de 300 mi.' },
      { en: 'Have IDs ready for the Border Patrol checkpoint on I-10 near Sierra Blanca.', es: 'Tener identificaciones listas para la revisión de la Patrulla Fronteriza en la I-10 cerca de Sierra Blanca.' },
    ],
    [ // before out5 (border day)
      { en: 'Verify Puente Colombia hours today.', es: 'Verificar hoy el horario del Puente Colombia.' },
      { en: 'Have ready: passports, license, registration/title, TIP printout, Mexican insurance, USD cash for the bridge, MXN for casetas.', es: 'Tener listo: pasaportes, licencia, tarjeta de circulación/título, TIP impreso, seguro mexicano, USD en efectivo para el puente, MXN para casetas.' },
      { en: 'Fill the tank in Laredo.', es: 'Llenar el tanque en Laredo.' },
      { en: 'Refresh Google Maps offline areas on hotel Wi-Fi.', es: 'Actualizar las zonas sin conexión de Google Maps con el Wi-Fi del hotel.' },
      { en: 'Confirm the Saltillo hotel has secure parking.', es: 'Confirmar que el hotel en Saltillo tenga estacionamiento seguro.' },
      { en: "Share the day's plan with family.", es: 'Compartir el plan del día con la familia.' },
      { en: 'Nothing visible in the car.', es: 'Nada a la vista dentro del carro.' },
      { en: 'FMM (tourist permit) for everyone: done online, or get it at the INM office at the bridge.', es: 'FMM (permiso de turista) para todos: ya tramitado en línea, o sacarlo en la oficina del INM en el puente.' },
      { en: 'Declare goods over $300 at Mexican customs (gifts count). Copies of the kids\' birth certificates at hand.', es: 'Declarar mercancía de más de $300 en la aduana mexicana (los regalos cuentan). Copias de las actas de nacimiento de los niños a la mano.' },
    ],
    [ // before out6
      { en: 'Leave at sunrise (~7:25 AM), not earlier.', es: 'Salir al amanecer (~7:25 AM), no antes.' },
      { en: 'Leave Saltillo with a full tank: the stretch to Matehuala is long desert with few services.', es: 'Salir de Saltillo con tanque lleno: el tramo a Matehuala es desierto largo con pocos servicios.' },
      { en: 'Expect fog on the high plains early and heavy trucks on 57D.', es: 'Esperar neblina temprano en el altiplano y mucho tráiler en la 57D.' },
      { en: 'If delayed, overnight in San Luis Potosí.', es: 'Si hay retraso, dormir en San Luis Potosí.' },
      { en: 'Avoid Querétaro to Celaya rush hour.', es: 'Evitar la hora pico de Querétaro a Celaya.' },
      { en: 'Send the arrival message.', es: 'Enviar el mensaje de llegada.' },
      { en: 'Fill up in Querétaro, then drive Querétaro – Celaya (45D) straight through in daylight: no stops on 45D.', es: 'Cargar gasolina en Querétaro y luego hacer Querétaro – Celaya (45D) de corrido y de día: sin paradas en la 45D.' },
    ],
    [ // before ret1 (Fri Jan 1)
      { en: 'Fill the tank in Celaya tonight.', es: 'Llenar el tanque en Celaya esta noche.' },
      { en: 'Leave at sunrise (~7:20 AM): Celaya – Querétaro on 45D straight through, no stops.', es: 'Salir al amanecer (~7:20 AM): Celaya – Querétaro por la 45D de corrido, sin paradas.' },
      { en: 'Confirm the Saltillo hotel (secure parking) and refresh Google Maps offline areas.', es: 'Confirmar el hotel en Saltillo (estacionamiento seguro) y actualizar las zonas sin conexión de Google Maps.' },
      { en: 'MXN cash for casetas; documents together: passports, TIP, FMM, insurance.', es: 'Efectivo en MXN para casetas; documentos juntos: pasaportes, TIP, FMM, seguro.' },
      { en: "Check the Mexican insurance covers through the crossing date (Jan 3).", es: 'Verificar que el seguro mexicano cubra hasta el día del cruce (3 de enero).' },
      { en: "Share the day's plan with family.", es: 'Compartir el plan del día con la familia.' },
    ],
    [ // before ret2 (border day, northbound)
      { en: 'CANCEL THE TIP at the Banjercito / Aduana module at Puente Colombia before crossing to the US. Keep the receipt (deposit refund).', es: 'CANCELAR EL TIP en el módulo de Banjercito / Aduana en el Puente Colombia antes de cruzar a EE. UU. Guardar el comprobante (reembolso del depósito).' },
      { en: 'Verify Puente Colombia hours today. Cash for the bridge toll.', es: 'Verificar hoy el horario del Puente Colombia. Efectivo para la cuota del puente.' },
      { en: 'Ask INM at the bridge whether to hand in the FMM.', es: 'Preguntar al INM en el puente si hay que entregar el FMM.' },
      { en: 'US customs: declare purchases; no fresh fruit, meat or plants.', es: 'Aduana de EE. UU.: declarar compras; no traer fruta fresca, carne ni plantas.' },
      { en: 'Fuel: enough to reach Laredo, fill up there.', es: 'Gasolina: suficiente para llegar a Laredo y llenar allá.' },
      { en: 'Nothing visible in the car. Send the "crossed" message.', es: 'Nada a la vista en el carro. Enviar el mensaje de "ya cruzamos".' },
    ],
    [ // before ret3
      { en: 'Longest US day. Clocks move −1 h west of Van Horn, TX.', es: 'El día más largo en EE. UU. El reloj se atrasa −1 h al oeste de Van Horn, TX.' },
      { en: 'Services are far apart in West Texas: refuel by the 300 mi rule.', es: 'Los servicios están muy separados en el oeste de Texas: recargar con la regla de 300 mi.' },
      { en: 'Have IDs ready for the Border Patrol checkpoint near Sierra Blanca.', es: 'Tener identificaciones listas para la revisión de la Patrulla Fronteriza cerca de Sierra Blanca.' },
    ],
    [ // before ret4
      { en: 'Short day. Check NMRoads and AZ511 for wind or dust storm warnings on I-10.', es: 'Día corto. Revisar NMRoads y AZ511 por alertas de viento o polvo en la I-10.' },
      { en: 'Vehicle check: tires, oil, wipers, washer fluid.', es: 'Revisión del vehículo: llantas, aceite, limpiadores, líquido.' },
    ],
    [ // before ret5
      { en: 'Clocks move −1 h in California.', es: 'El reloj se atrasa −1 h en California.' },
      { en: 'Fill up in Arizona: CA gas is expensive.', es: 'Llenar en Arizona: la gasolina en CA es cara.' },
      { en: 'Check Caltrans for Grapevine (I-5 Tejon Pass) closures.', es: 'Revisar Caltrans por cierres en el Grapevine (I-5 Tejon Pass).' },
    ],
    [ // before ret6
      { en: 'Check Caltrans QuickMap and ODOT TripCheck for snow and chain controls on Mt. Shasta / Siskiyou Pass. Carry chains.', es: 'Revisar Caltrans QuickMap y ODOT TripCheck por nieve y control de cadenas en Mt. Shasta / Siskiyou Pass. Llevar cadenas.' },
      { en: 'If the pass is closed or chains are required late in the day, stop in Redding and finish in the morning.', es: 'Si el paso está cerrado o piden cadenas tarde, dormir en Redding y terminar en la mañana.' },
      { en: 'Export a JSON backup of the trip (More → Data).', es: 'Exportar un respaldo JSON del viaje (Más → Datos).' },
    ],
  ];

  const expectedTolls = [
    { key: 'out-colombia', leg: 'out', name: 'Puente Internacional Colombia', highway: 'Bridge', estAmount: null, currency: 'USD', kind: 'bridge', optional: false,
      note: { en: 'Bridge toll, USD cash.', es: 'Cuota del puente, efectivo en USD.' } },
    { key: 'out-85d', leg: 'out', name: 'Monterrey – Nuevo Laredo', highway: '85D', estAmount: 366, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'Only if used.', es: 'Solo si se usa.' } },
    { key: 'out-40d', leg: 'out', name: 'Monterrey – Saltillo', highway: '40D', estAmount: 150, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },
    { key: 'out-57d', leg: 'out', name: 'Saltillo – San Luis Potosí – Querétaro casetas', highway: '57D', matchHighway: '57', estAmount: null, currency: 'MXN', kind: 'toll', optional: false,
      note: { en: 'Enter each caseta name as you pass it (highway 57/57D).', es: 'Anotar el nombre de cada caseta al pasarla (carretera 57/57D).' } },
    { key: 'out-libqro', leg: 'out', name: 'Libramiento Noreste de Querétaro', highway: 'Libramiento NE', estAmount: 65, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'If used.', es: 'Si se usa.' } },
    { key: 'out-45d', leg: 'out', name: 'Querétaro – Celaya', highway: '45D', estAmount: 105, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },

    { key: 'ret-45d', leg: 'return', name: 'Celaya – Querétaro (return)', highway: '45D', estAmount: 105, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },
    { key: 'ret-libqro', leg: 'return', name: 'Libramiento Noreste de Querétaro (return)', highway: 'Libramiento NE', estAmount: 65, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'If used.', es: 'Si se usa.' } },
    { key: 'ret-57d', leg: 'return', name: 'Querétaro – San Luis Potosí – Saltillo casetas (return)', highway: '57D', matchHighway: '57', estAmount: null, currency: 'MXN', kind: 'toll', optional: false,
      note: { en: 'Enter each caseta name as you pass it (highway 57/57D).', es: 'Anotar el nombre de cada caseta al pasarla (carretera 57/57D).' } },
    { key: 'ret-40d', leg: 'return', name: 'Saltillo – Monterrey (return)', highway: '40D', estAmount: 150, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },
    { key: 'ret-85d', leg: 'return', name: 'Monterrey – Nuevo Laredo (return)', highway: '85D', estAmount: 366, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'Only if used.', es: 'Solo si se usa.' } },
    { key: 'ret-colombia', leg: 'return', name: 'Puente Internacional Colombia (return)', highway: 'Bridge', estAmount: null, currency: 'MXN', kind: 'bridge', optional: false,
      note: { en: 'Northbound bridge toll, paid on the Mexican side. Have MXN and USD cash.', es: 'Cuota del puente rumbo al norte, se paga del lado mexicano. Tener efectivo en MXN y USD.' } },
  ];

  // Budget lines (editable). amount is the planned total for the round trip.
  const budget = [
    { cat: 'fuel', amount: 1140, currency: 'USD', note: { en: '~$570 each way', es: '~$570 por trayecto' } },
    { cat: 'toll', amount: 2800, currency: 'MXN', note: { en: 'Mexican tolls ~MX$1,400 each way', es: 'Casetas en México ~MX$1,400 por trayecto' } },
    { cat: 'hotel', amount: 1300, currency: 'USD', note: { en: '$100–130/night × 10 nights (5 each way)', es: '$100–130/noche × 10 noches (5 por trayecto)' } },
    { cat: 'food', amount: 720, currency: 'USD', note: { en: '$40–60/day × 12 travel days', es: '$40–60/día × 12 días de camino' } },
    { cat: 'bridge', amount: 0, currency: 'USD', note: { en: 'Bridge tolls (cash), both directions', es: 'Cuotas del puente (efectivo), ida y vuelta' } },
    { cat: 'permits', amount: 355, currency: 'USD', note: { en: 'TIP ~$55 + Mexican insurance $150–300 (+ FMM if needed)', es: 'TIP ~$55 + seguro mexicano $150–300 (+ FMM si aplica)' } },
    { cat: 'other', amount: 0, currency: 'USD', note: { en: '', es: '' } },
  ];

  const docs = [
    { key: 'passports', text: { en: 'Passports (everyone)', es: 'Pasaportes (todos)' } },
    { key: 'license', text: { en: "Driver's license", es: 'Licencia de manejo' } },
    { key: 'registration', text: { en: 'Vehicle registration / title', es: 'Tarjeta de circulación / título del vehículo' } },
    { key: 'tip', text: { en: 'TIP (Banjercito, available online up to 60 days ahead)', es: 'Permiso de importación temporal TIP (Banjercito, en línea hasta 60 días antes)' } },
    { key: 'insurance', text: { en: 'Mexican auto insurance (covers Dec 16 – Jan 3)', es: 'Seguro de auto mexicano (cubre del 16 de dic. al 3 de ene.)' } },
    { key: 'usd', text: { en: 'USD cash', es: 'Efectivo en USD' } },
    { key: 'mxn', text: { en: 'MXN cash', es: 'Efectivo en MXN' } },
    { key: 'tag', text: { en: 'TAG for tolls', es: 'TAG para casetas' } },
    { key: 'charger', text: { en: 'Phone charger', es: 'Cargador de teléfono' } },
    { key: 'papermap', text: { en: 'Paper map', es: 'Mapa de papel' } },
    { key: 'fmm', text: { en: 'FMM tourist permit for everyone who needs one (apply online at inm.gob.mx or at the INM office at the bridge)', es: 'FMM (permiso de turista) para quien lo necesite (en línea en inm.gob.mx o en la oficina del INM en el puente)' } },
    { key: 'kids', text: { en: "Copies of each child's birth certificate; notarized permission if a Mexican/dual-citizen minor travels without a parent", es: 'Copias de las actas de nacimiento de los niños; permiso notariado si un menor mexicano/doble nacionalidad viaja sin uno de sus padres' } },
    { key: 'customs', text: { en: 'List of gifts/goods: declare over $300 entering Mexico by land (one laptop per person is tax-free)', es: 'Lista de regalos/mercancía: declarar más de $300 al entrar a México por tierra (una laptop por persona sin impuesto)' } },
    { key: 'step', text: { en: 'Enroll in STEP (mytravel.state.gov) for embassy alerts', es: 'Inscribirse en STEP (mytravel.state.gov) para alertas de la embajada' } },
    { key: 'tipcancel', text: { en: 'Return trip: cancel the TIP at the border before leaving Mexico (keep the receipt)', es: 'Regreso: cancelar el TIP en la frontera antes de salir de México (guardar el comprobante)' } },
  ];

  return { version, days, tomorrow, expectedTolls, budget, docs };
})();
