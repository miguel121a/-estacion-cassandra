// Estacion UTHH · Reto 2: copia las alertas que ya existen en alertas_por_dia a alertas_por_sensor.
// Solo se corre una vez; las alertas nuevas ya se escriben solas desde guardarLectura().
//   node rellenar_alertas.js      -> ultimos 8 dias
//   node rellenar_alertas.js 3    -> ultimos 3 dias

const { KS, LocalDate, crearCliente, diaLocal } = require("./bd");
const cliente = crearCliente();

async function main() {
  const dias = Number(process.argv[2]) || 8;
  let total = 0;
  for (let k = 0; k < dias; k++) {
    const dia = diaLocal(new Date(Date.now() - k * 86400000));
    // Una particion de alertas_por_dia (la del dia); el for await pide las paginas que falten
    const r = await cliente.execute(
      `SELECT dia, hora, sensor, temperatura, mensaje FROM ${KS}.alertas_por_dia WHERE dia = ?`,
      [LocalDate.fromString(dia)], { prepare: true, fetchSize: 500 });
    let n = 0;
    for await (const a of r) {
      await cliente.execute(
        `INSERT INTO ${KS}.alertas_por_sensor (sensor, dia, hora, temperatura, mensaje) VALUES (?, ?, ?, ?, ?)`,
        [a.sensor, a.dia, a.hora, a.temperatura, a.mensaje], { prepare: true });
      n++;
    }
    console.log(dia + "  " + n + " alertas copiadas");
    total += n;
  }
  console.log("Listo: " + total + " alertas en alertas_por_sensor.");
  await cliente.shutdown();
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });