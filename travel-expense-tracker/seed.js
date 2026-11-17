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
  const version = 3;

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
  const BTW = S('Buttonwillow, CA (I-5)', 35.4005, -119.4696);
  const KET = S('Kettleman City, CA (I-5)', 36.0083, -119.9618);
  const EGP = S('Eagle Pass, TX', 28.7091, -100.4995, 7000);
  const PNG = S('Piedras Negras, Coah.', 28.7000, -100.5236, 6000);
  const MCL = S('Monclova, Coah.', 26.9080, -101.4215, 6000);
  const DRT = S('Del Rio, TX', 29.3709, -100.8959, 7000);
  const FST = S('Fort Stockton, TX', 30.8940, -102.8793);
  const SAN = S('Sanderson, TX', 30.1424, -102.3940);
  const VHN = S('Van Horn, TX', 31.0399, -104.8307);
  // Border-day links: live bridge waits and backup crossings.
  const BORDER_LINKS = [
    { label: { en: 'Bridge wait times (filadepuentes)', es: 'Tiempos de espera (filadepuentes)' }, url: 'https://filadepuentes.com/cruces' },
    { label: { en: 'US CBP official wait times', es: 'Tiempos oficiales CBP (EE. UU.)' }, url: 'https://bwt.cbp.gov/' },
    { label: { en: 'Banjercito (TIP) 24/7 – Km 53.4, Hwy 57 near Allende', es: 'Banjercito (TIP) 24 h – Km 53.4, Carr. 57 cerca de Allende' }, url: 'https://www.google.com/maps/search/?api=1&query=Banjercito%20Km%2053%20Carretera%2057%20Allende%20Coahuila' },
    { label: { en: 'Backup: Del Rio – Ciudad Acuña bridge (~1 h north)', es: 'Respaldo: puente Del Rio – Ciudad Acuña (~1 h al norte)' }, url: 'https://www.google.com/maps/search/?api=1&query=Del%20Rio%20International%20Bridge%20Del%20Rio%20TX' },
    { label: { en: 'Backup: Puente Colombia (Laredo, ~2.5 h south)', es: 'Respaldo: Puente Colombia (Laredo, ~2.5 h al sur)' }, url: 'https://www.google.com/maps/search/?api=1&query=Puente%20Internacional%20Solidaridad%20Colombia' },
  ];

  const days = [
    {
      key: 'out1', leg: 'out', date: '2026-12-12',
      from: 'Grants Pass, OR', to: 'Buttonwillow, CA (I-5)',
      fromLat: 42.4390, fromLng: -123.3284, toLat: 35.4005, toLng: -119.4696,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Los_Angeles',
      distanceMi: 565, distanceNote: '~565 mi (est.; Google to downtown Bakersfield: 614 mi, 9 h 40)',
      driveHours: '~8 h 45', start: '06:00', arrive: '15:45',
      route: 'I-5 S all the way (stays on I-5 past Bakersfield, no city detour)',
      notes: { en: 'Longest day of the trip: keep stops short (combine fuel + food). Overnight right on I-5 so Day 2 starts on the highway. Bakersfield (~25 mi further) has more hotels if needed.', es: 'El día más largo del viaje: paradas cortas (juntar gasolina + comida). Dormir junto a la I-5 para que el Día 2 empiece en la carretera. Bakersfield (~25 mi más) tiene más hoteles si hace falta.' },
      stops: [GP, S('Redding, CA', 40.5865, -122.3917), S('Williams, CA', 39.1546, -122.1494), S('Dunnigan, CA', 38.8857, -121.9694), KET, BTW],
      fuelStops: [
        { en: 'Fill up in Grants Pass (cheaper than CA).', es: 'Llenar el tanque en Grants Pass (más barato que CA).' },
        { en: 'Refuel at Williams / Dunnigan, CA (~290 mi).', es: 'Recargar en Williams / Dunnigan, CA (~290 mi).' },
      ],
      fuelSearch: ['gas station Grants Pass OR', "Love's Travel Stop near Williams CA", 'Pilot Flying J near Dunnigan CA'],
      foodSearch: ['rest area I-5 near Redding CA', 'restaurants near Williams CA I-5', 'restaurants Kettleman City CA'],
      overnightSearch: ['hotels Buttonwillow CA I-5', 'hotels Kettleman City CA', 'hotels near I-5 Bakersfield CA'],
    },
    {
      key: 'out2', leg: 'out', date: '2026-12-13',
      from: 'Buttonwillow, CA (I-5)', to: 'Phoenix, AZ (Chandler/Tempe)',
      fromLat: 35.4005, fromLng: -119.4696, toLat: 33.3062, toLng: -111.8413,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Phoenix',
      distanceMi: 520, distanceNote: '~520 mi (Google, from Bakersfield: 507 mi, 7 h 43)',
      driveHours: '~8 h', start: '06:00', arrive: '16:00',
      route: 'I-5 S (Grapevine), I-210 E, I-10 E',
      tzNote: { en: 'Clocks +1 h at the Arizona line (Arizona MST, no DST).', es: 'Reloj +1 h al entrar a Arizona (MST, sin horario de verano).' },
      notes: { en: '', es: '' },
      stops: [BTW, S('Banning, CA', 33.9256, -116.8764), S('Chiriaco Summit, CA', 33.6614, -115.7219), S('Blythe, CA', 33.6103, -114.5964), S('Quartzsite, AZ', 33.6639, -114.2299), S('Tonopah, AZ', 33.4934, -112.9363), PHX],
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
      distanceMi: 413, distanceNote: '413 mi (Google)',
      driveHours: '6 h 10', start: '06:00', arrive: '14:00',
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
      from: 'El Paso, TX', to: 'Eagle Pass, TX',
      fromLat: 31.7619, fromLng: -106.4850, toLat: 28.7091, toLng: -100.4995,
      country: 'US', startTz: 'America/Denver', arriveTz: 'America/Chicago',
      distanceMi: 480, distanceNote: '~480 mi (est.)',
      driveHours: '~7 h 15', start: '06:00', arrive: '15:30',
      route: 'I-10 E to Fort Stockton, US-285 S to Sanderson, US-90 E to Del Rio, US-277 S to Eagle Pass (follow Google if it picks a faster link)',
      routeVia: 'Fort Stockton, TX|Del Rio, TX',
      tzNote: { en: 'Clocks +1 h east of Van Horn, TX (Central time).', es: 'Reloj +1 h al este de Van Horn, TX (hora del Centro).' },
      notes: { en: 'Overnight on the US side; cross at Puente 2 tomorrow after sunrise. Border Patrol checkpoints near Sierra Blanca (I-10) and on highways near the border: IDs ready.', es: 'Dormir del lado de EE. UU.; cruzar mañana por el Puente 2 después del amanecer. Revisiones de la Patrulla Fronteriza cerca de Sierra Blanca (I-10) y en carreteras cerca de la frontera: identificaciones listas.' },
      stops: [ELP, VHN, FST, SAN, DRT, EGP],
      fuelStops: [
        { en: 'Fill up in El Paso.', es: 'Llenar el tanque en El Paso.' },
        { en: 'Refuel at Fort Stockton (~240 mi): few services on US-90 until Del Rio.', es: 'Recargar en Fort Stockton (~240 mi): pocos servicios en la US-90 hasta Del Rio.' },
        { en: 'Fill up in Eagle Pass tonight (cheaper than Mexico).', es: 'Llenar el tanque en Eagle Pass esta noche (más barato que en México).' },
      ],
      fuelSearch: ['Pilot Flying J near Fort Stockton TX', "Love's Travel Stop near Van Horn TX", 'gas station Del Rio TX', 'gas station Eagle Pass TX'],
      foodSearch: ['restaurants near Van Horn TX', 'restaurants near Fort Stockton TX', 'restaurants Del Rio TX'],
      overnightSearch: ['hotels Eagle Pass TX', 'Holiday Inn Express Eagle Pass TX', 'Hampton Inn Eagle Pass TX', 'hotels Del Rio TX'],
    },
    {
      key: 'out5', leg: 'out', date: '2026-12-16',
      from: 'Eagle Pass, TX', to: 'Saltillo, Coahuila',
      fromLat: 28.7091, fromLng: -100.4995, toLat: 25.4232, toLng: -101.0053,
      country: 'BORDER', startTz: 'America/Chicago', arriveTz: 'America/Monterrey',
      distanceMi: 275, distanceNote: '~440 km (est.)',
      driveHours: '~5 h + 0.5–1 h border', start: '07:45', arrive: '14:30',
      route: 'Puente Internacional II "Camino Real" (Puente 2) into Piedras Negras, Hwy 57 S via Allende and Monclova, Castaños, Saltillo',
      routeVia: 'Puente Internacional Piedras Negras II, Piedras Negras, Coahuila|Monclova, Coahuila',
      notes: { en: 'Border day. Cross at Puente 2 (passenger lanes 24/7) after sunrise. TIP: ideally bought online beforehand; if not, Banjercito at Puente II (Mon–Fri 8 AM–4 PM) or the 24/7 module at Km 53.4 on Hwy 57 near Allende, on the way. Backup bridges: Del Rio – Ciudad Acuña (~1 h north, Banjercito 6 AM–10 PM) or Puente Colombia (~2.5 h south, bridge 8 AM–11 PM).', es: 'Día de frontera. Cruzar por el Puente 2 (carriles de pasajeros 24 h) después del amanecer. TIP: de preferencia comprado en línea antes; si no, Banjercito en el Puente II (lun–vie 8 AM–4 PM) o el módulo 24 h en el Km 53.4 de la Carr. 57 cerca de Allende, de paso. Puentes de respaldo: Del Rio – Ciudad Acuña (~1 h al norte, Banjercito 6 AM–10 PM) o Puente Colombia (~2.5 h al sur, puente 8 AM–11 PM).' },
      links: BORDER_LINKS,
      stops: [EGP, PNG, S('Allende, Coah.', 28.3445, -100.8530), MCL, S('Castaños, Coah.', 26.7840, -101.4290), SAL],
      fuelStops: [
        { en: 'Leave Eagle Pass with a full tank (filled last night).', es: 'Salir de Eagle Pass con tanque lleno (cargado anoche).' },
        { en: 'Refuel in Monclova if below 1/2 tank; fill up in Saltillo.', es: 'Recargar en Monclova si baja de 1/2 tanque; llenar en Saltillo.' },
      ],
      fuelSearch: ['Pemex Monclova', 'OXXO Gas Monclova', 'Pemex Saltillo', 'OXXO Gas Saltillo'],
      foodSearch: ['restaurantes Allende Coahuila', 'VIPS Monclova', 'VIPS Saltillo'],
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
      from: 'Saltillo, Coahuila', to: 'Eagle Pass, TX',
      fromLat: 25.4232, fromLng: -101.0053, toLat: 28.7091, toLng: -100.4995,
      country: 'BORDER', startTz: 'America/Monterrey', arriveTz: 'America/Chicago',
      distanceMi: 275, distanceNote: '~440 km (est.)',
      driveHours: '~5 h + 1–2 h border', start: '07:35', arrive: '15:00',
      route: 'Hwy 57 N via Castaños, Monclova and Allende to Piedras Negras, Puente Internacional II "Camino Real" (Puente 2) into Eagle Pass',
      routeVia: 'Monclova, Coahuila|Puente Internacional Piedras Negras II, Piedras Negras, Coahuila',
      notes: { en: 'Border day (Sunday). Cancel the TIP at the 24/7 Banjercito module at Km 53.4 on Hwy 57 near Allende, on the way north, BEFORE the bridge (the Puente II office is closed on Sundays). Keep the receipt. Check bridge wait times in the morning.', es: 'Día de frontera (domingo). Cancelar el TIP en el módulo de Banjercito 24 h del Km 53.4 de la Carr. 57 cerca de Allende, de paso rumbo al norte, ANTES del puente (la oficina del Puente II cierra en domingo). Guardar el comprobante. Revisar los tiempos de espera en la mañana.' },
      links: BORDER_LINKS,
      stops: [SAL, S('Castaños, Coah.', 26.7840, -101.4290), MCL, S('Allende, Coah.', 28.3445, -100.8530), PNG, EGP],
      fuelStops: [
        { en: 'Leave Saltillo with enough fuel to reach Eagle Pass (refuel in Monclova if needed).', es: 'Salir de Saltillo con gasolina para llegar a Eagle Pass (recargar en Monclova si hace falta).' },
        { en: 'Fill up in Eagle Pass, TX.', es: 'Llenar el tanque en Eagle Pass, TX.' },
      ],
      fuelSearch: ['OXXO Gas Saltillo', 'Pemex Monclova', 'gas station Eagle Pass TX'],
      foodSearch: ['VIPS Saltillo', 'VIPS Monclova', 'restaurants Eagle Pass TX'],
      overnightSearch: ['hotels Eagle Pass TX', 'Holiday Inn Express Eagle Pass TX', 'Hampton Inn Eagle Pass TX'],
    },
    {
      key: 'ret3', leg: 'return', date: '2027-01-04',
      from: 'Eagle Pass, TX', to: 'El Paso, TX',
      fromLat: 28.7091, fromLng: -100.4995, toLat: 31.7619, toLng: -106.4850,
      country: 'US', startTz: 'America/Chicago', arriveTz: 'America/Denver',
      distanceMi: 480, distanceNote: '~480 mi (est.)',
      driveHours: '~7 h 15', start: '06:00', arrive: '13:30',
      route: 'US-277 N to Del Rio, US-90 W to Sanderson, US-285 N to Fort Stockton, I-10 W to El Paso',
      routeVia: 'Del Rio, TX|Fort Stockton, TX',
      tzNote: { en: 'Clocks −1 h west of Van Horn, TX (Mountain time).', es: 'Reloj −1 h al oeste de Van Horn, TX (hora de la Montaña).' },
      notes: { en: 'Border Patrol checkpoints on highways near the border and near Sierra Blanca (I-10): IDs ready.', es: 'Revisiones de la Patrulla Fronteriza en carreteras cerca de la frontera y cerca de Sierra Blanca (I-10): identificaciones listas.' },
      stops: [EGP, DRT, SAN, FST, VHN, ELP],
      fuelStops: [
        { en: 'Fill up in Eagle Pass or Del Rio: few services on US-90 until Fort Stockton.', es: 'Llenar en Eagle Pass o Del Rio: pocos servicios en la US-90 hasta Fort Stockton.' },
        { en: 'Refuel at Fort Stockton, then Van Horn if needed.', es: 'Recargar en Fort Stockton, luego Van Horn si hace falta.' },
      ],
      fuelSearch: ['gas station Del Rio TX', 'Pilot Flying J near Fort Stockton TX', "Love's Travel Stop near Van Horn TX"],
      foodSearch: ['restaurants Del Rio TX', 'restaurants near Fort Stockton TX', 'restaurants near Van Horn TX'],
      overnightSearch: ['hotels near I-10 El Paso TX', 'Hampton Inn El Paso', 'Holiday Inn Express El Paso'],
    },
    {
      key: 'ret4', leg: 'return', date: '2027-01-05',
      from: 'El Paso, TX', to: 'Phoenix, AZ (Chandler/Tempe)',
      fromLat: 31.7619, fromLng: -106.4850, toLat: 33.3062, toLng: -111.8413,
      country: 'US', startTz: 'America/Denver', arriveTz: 'America/Phoenix',
      distanceMi: 413, distanceNote: '413 mi (Google)',
      driveHours: '6 h 10', start: '06:00', arrive: '13:30',
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
      from: 'Phoenix, AZ', to: 'Kettleman City, CA (I-5)',
      fromLat: 33.3062, fromLng: -111.8413, toLat: 36.0083, toLng: -119.9618,
      country: 'US', startTz: 'America/Phoenix', arriveTz: 'America/Los_Angeles',
      distanceMi: 565, distanceNote: '~565 mi (est.)',
      driveHours: '~8 h 30', start: '06:00', arrive: '14:45',
      route: 'I-10 W, I-210 W, I-5 N (Grapevine), stay on I-5 to Kettleman City',
      tzNote: { en: 'Clocks −1 h at the California line (Pacific time).', es: 'Reloj −1 h al entrar a California (hora del Pacífico).' },
      notes: { en: 'Going past Bakersfield to Kettleman City leaves more daylight for the mountains tomorrow.', es: 'Pasar Bakersfield hasta Kettleman City deja más luz de día para la sierra mañana.' },
      stops: [PHX, S('Tonopah, AZ', 33.4934, -112.9363), S('Quartzsite, AZ', 33.6639, -114.2299), S('Blythe, CA', 33.6103, -114.5964), S('Chiriaco Summit, CA', 33.6614, -115.7219), S('Banning, CA', 33.9256, -116.8764), BTW, KET],
      fuelStops: [
        { en: 'Fill up in Phoenix (cheaper than CA).', es: 'Llenar el tanque en Phoenix (más barato que CA).' },
        { en: 'Top off at Quartzsite, AZ before the California line; buy only what you need in CA.', es: 'Completar en Quartzsite, AZ antes de entrar a California; en CA cargar solo lo necesario.' },
      ],
      fuelSearch: ['TA Travel Center near Tonopah AZ', "Love's Travel Stop near Quartzsite AZ", 'gas station Kettleman City CA'],
      foodSearch: ['restaurants near Quartzsite AZ', 'rest area I-10 near Chiriaco Summit CA', 'restaurants Kettleman City CA'],
      overnightSearch: ['hotels Kettleman City CA', 'hotels Buttonwillow CA I-5', 'hotels Lost Hills CA I-5'],
    },
    {
      key: 'ret6', leg: 'return', date: '2027-01-07',
      from: 'Kettleman City, CA (I-5)', to: 'Grants Pass, OR',
      fromLat: 36.0083, fromLng: -119.9618, toLat: 42.4390, toLng: -123.3284,
      country: 'US', startTz: 'America/Los_Angeles', arriveTz: 'America/Los_Angeles',
      distanceMi: 520, distanceNote: '~520 mi (est.)',
      driveHours: '~8 h', start: '06:00', arrive: '15:15',
      route: 'I-5 N',
      notes: { en: 'Home! Siskiyou Pass in January: check chain controls before leaving.', es: '¡A casa! Siskiyou Pass en enero: revisar control de cadenas antes de salir.' },
      stops: [KET, S('Dunnigan, CA', 38.8857, -121.9694), S('Williams, CA', 39.1546, -122.1494), S('Redding, CA', 40.5865, -122.3917), GP],
      fuelStops: [
        { en: 'Buy only what you need in CA.', es: 'En CA cargar solo lo necesario.' },
        { en: 'Refuel at Williams / Dunnigan, then Redding before the mountains.', es: 'Recargar en Williams / Dunnigan, luego Redding antes de la sierra.' },
      ],
      fuelSearch: ['Pilot Flying J near Dunnigan CA', "Love's Travel Stop near Williams CA", 'gas station Redding CA I-5'],
      foodSearch: ['restaurants near Williams CA I-5', 'restaurants near Redding CA I-5', 'rest area I-5 near Dunnigan CA'],
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
      { en: 'Clocks move +1 h after Van Horn, TX.', es: 'El reloj se adelanta +1 h después de Van Horn, TX.' },
      { en: 'Services are far apart, especially US-90 between Sanderson and Del Rio: refuel in Fort Stockton.', es: 'Los servicios están muy separados, sobre todo en la US-90 entre Sanderson y Del Rio: recargar en Fort Stockton.' },
      { en: 'Have IDs ready for Border Patrol checkpoints (I-10 near Sierra Blanca and highways near the border).', es: 'Tener identificaciones listas para las revisiones de la Patrulla Fronteriza (I-10 cerca de Sierra Blanca y carreteras cerca de la frontera).' },
      { en: 'Confirm the Eagle Pass hotel. Fill the tank in Eagle Pass tonight.', es: 'Confirmar el hotel en Eagle Pass. Llenar el tanque en Eagle Pass esta noche.' },
    ],
    [ // before out5 (border day)
      { en: 'Check Puente 2 (Camino Real) hours and the wait time (Bridge wait times button on Day 5).', es: 'Revisar el horario y el tiempo de espera del Puente 2 (Camino Real) (botón Tiempos de espera en el Día 5).' },
      { en: 'Have ready: passports, license, registration/title, TIP printout, Mexican insurance, USD cash for the bridge, MXN for casetas.', es: 'Tener listo: pasaportes, licencia, tarjeta de circulación/título, TIP impreso, seguro mexicano, USD en efectivo para el puente, MXN para casetas.' },
      { en: 'Fill the tank in Eagle Pass tonight.', es: 'Llenar el tanque en Eagle Pass esta noche.' },
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
      { en: 'CANCEL THE TIP at Banjercito Km 53.4, Hwy 57 near Allende (open 24/7), on the way north before the bridge. The Puente II office is closed on Sunday. Keep the receipt (deposit refund).', es: 'CANCELAR EL TIP en Banjercito Km 53.4, Carr. 57 cerca de Allende (abierto 24 h), de paso rumbo al norte antes del puente. La oficina del Puente II cierra en domingo. Guardar el comprobante (reembolso del depósito).' },
      { en: 'Check Puente 2 hours and the wait time in the morning. Cash for the bridge toll.', es: 'Revisar en la mañana el horario y el tiempo de espera del Puente 2. Efectivo para la cuota del puente.' },
      { en: 'Ask INM at the bridge whether to hand in the FMM.', es: 'Preguntar al INM en el puente si hay que entregar el FMM.' },
      { en: 'US customs: declare purchases; no fresh fruit, meat or plants.', es: 'Aduana de EE. UU.: declarar compras; no traer fruta fresca, carne ni plantas.' },
      { en: 'Fuel: enough to reach Eagle Pass (refuel in Monclova if needed), fill up there.', es: 'Gasolina: suficiente para llegar a Eagle Pass (recargar en Monclova si hace falta) y llenar allá.' },
      { en: 'Nothing visible in the car. Send the "crossed" message.', es: 'Nada a la vista en el carro. Enviar el mensaje de "ya cruzamos".' },
    ],
    [ // before ret3
      { en: 'Clocks move −1 h west of Van Horn, TX.', es: 'El reloj se atrasa −1 h al oeste de Van Horn, TX.' },
      { en: 'Leave with a full tank: few services on US-90 between Del Rio and Fort Stockton.', es: 'Salir con tanque lleno: pocos servicios en la US-90 entre Del Rio y Fort Stockton.' },
      { en: 'Have IDs ready for Border Patrol checkpoints (highways near the border and I-10 near Sierra Blanca).', es: 'Tener identificaciones listas para las revisiones de la Patrulla Fronteriza (carreteras cerca de la frontera y la I-10 cerca de Sierra Blanca).' },
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
    { key: 'out-bridge2', leg: 'out', name: 'Puente Internacional II "Camino Real" (Eagle Pass – Piedras Negras)', highway: 'Bridge', estAmount: null, currency: 'USD', kind: 'bridge', optional: false,
      note: { en: 'Bridge toll, have USD cash.', es: 'Cuota del puente, tener efectivo en USD.' } },
    { key: 'out-57d', leg: 'out', name: 'Hwy 57 / 57D casetas (Piedras Negras – Saltillo – Querétaro)', highway: '57D', matchHighway: '57', estAmount: null, currency: 'MXN', kind: 'toll', optional: false,
      note: { en: 'Enter each caseta name as you pass it (highway 57/57D).', es: 'Anotar el nombre de cada caseta al pasarla (carretera 57/57D).' } },
    { key: 'out-libqro', leg: 'out', name: 'Libramiento Noreste de Querétaro', highway: 'Libramiento NE', estAmount: 65, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'If used.', es: 'Si se usa.' } },
    { key: 'out-45d', leg: 'out', name: 'Querétaro – Celaya', highway: '45D', estAmount: 105, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },

    { key: 'ret-45d', leg: 'return', name: 'Celaya – Querétaro (return)', highway: '45D', estAmount: 105, currency: 'MXN', kind: 'toll', optional: false, note: { en: '', es: '' } },
    { key: 'ret-libqro', leg: 'return', name: 'Libramiento Noreste de Querétaro (return)', highway: 'Libramiento NE', estAmount: 65, currency: 'MXN', kind: 'toll', optional: true,
      note: { en: 'If used.', es: 'Si se usa.' } },
    { key: 'ret-57d', leg: 'return', name: 'Hwy 57D / 57 casetas (Querétaro – Saltillo – Piedras Negras) (return)', highway: '57D', matchHighway: '57', estAmount: null, currency: 'MXN', kind: 'toll', optional: false,
      note: { en: 'Enter each caseta name as you pass it (highway 57/57D).', es: 'Anotar el nombre de cada caseta al pasarla (carretera 57/57D).' } },
    { key: 'ret-bridge2', leg: 'return', name: 'Puente Internacional II "Camino Real" (return)', highway: 'Bridge', estAmount: null, currency: 'MXN', kind: 'bridge', optional: false,
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
    { key: 'tip', text: { en: 'TIP: buy online from Banjercito 10–60 days before crossing. For Dec 16: between Oct 17 and Dec 6', es: 'TIP: comprar en línea con Banjercito de 10 a 60 días antes de cruzar. Para el 16 de dic.: entre el 17 de oct. y el 6 de dic.' } },
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
    { key: 'banjercito', text: { en: 'Ask Banjercito (Contacto on gob.mx/banjercito): "¿El módulo del Km 53.4 de la carretera 57 (Allende, Piedras Negras) cancela permisos de importación temporal un domingo?"', es: 'Preguntar a Banjercito (Contacto en gob.mx/banjercito): "¿El módulo del Km 53.4 de la carretera 57 (Allende, Piedras Negras) cancela permisos de importación temporal un domingo?"' } },
    { key: 'inm', text: { en: 'FMM: apply online, or confirm the INM office hours at Piedras Negras Puente II', es: 'FMM: tramitar en línea, o confirmar el horario de la oficina del INM en Piedras Negras Puente II' } },
    { key: 'tipcancel', text: { en: 'Return trip: cancel the TIP at the border before leaving Mexico (keep the receipt)', es: 'Regreso: cancelar el TIP en la frontera antes de salir de México (guardar el comprobante)' } },
  ];

  return { version, days, tomorrow, expectedTolls, budget, docs };
})();
