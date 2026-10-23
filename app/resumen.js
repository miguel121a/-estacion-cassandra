// Estacion UTHH · Reto 1: llena resumen_por_dia leyendo cada particion de lecturas_por_sensor_dia.
//   node resumen.js      -> ultimos 8 dias
//   node resumen.js 3    -> ultimos 3 dias

const { KS, LocalDate, crearCliente, diaLocal, leerSensores } = require("./bd");
const cliente = crearCliente();

async function main() {
  const dias = Number(process.argv[2]) || 8;
  const sensores = Object.values(await leerSensores(cliente)).sort((a, b) => a.id.localeCompare(b.id));
  let escritos = 0;
  for (const s of sensores) {
    for (let k = dias - 1; k >= 0; k--) {
      const dia = diaLocal(new Date(Date.now() - k * 86400000));
      const fecha = LocalDate.fromString(dia);
      // Lee UNA particion (sensor, dia); Cassandra calcula MIN, MAX, AVG y COUNT dentro de ella
      const r = await cliente.execute(
        `SELECT MIN(temperatura) AS minima, MAX(temperatura) AS maxima, AVG(temperatura) AS promedio, COUNT(*) AS lecturas ` +
        `FROM ${KS}.lecturas_por_sensor_dia WHERE sensor = ? AND dia = ?`,
        [s.id, fecha], { prepare: true });
      const f = r.first();
      const n = Number(f.lecturas);
      if (!n) continue;                        // ese dia no tiene lecturas
      const prom = Math.round(f.promedio * 10) / 10;
      const min = Math.round(f.minima * 10) / 10, max = Math.round(f.maxima * 10) / 10;
      await cliente.execute(
        `INSERT INTO ${KS}.resumen_por_dia (sensor, dia, minima, maxima, promedio, lecturas) VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, fecha, min, max, prom, n], { prepare: true });
      escritos++;
      console.log(s.id + "  " + dia + "  min " + min.toFixed(1) + "  max " + max.toFixed(1) +
        "  prom " + prom.toFixed(1) + "  (" + n + " lecturas)");
    }
  }
  console.log("Listo: " + escritos + " filas en resumen_por_dia.");
  await cliente.shutdown();
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });