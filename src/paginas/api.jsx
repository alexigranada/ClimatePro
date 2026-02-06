import './api.css'

function ApiPage() {
  return (
    <section className="api_page">

      {/* ================= INTRODUCCIÓN ================= 
      <header className="api_header">
        <h1>API de datos climáticos</h1>
        <p>
          Esta API proporciona acceso programático a los datos de temperatura y
          precipitación generados mediante técnicas de downscaling estadístico,
          con resolución espacial de 1 km y temporalidad horaria para la costa
          Pacífica del departamento de Valle del Cauca.
        </p>
      </header>*/}

      <article className="api_content">

        {/* ================= PROPÓSITO ================= */}
        <h2>Propósito de la API</h2>
        <p>
          El servicio fue desarrollado con el objetivo de facilitar la integración
          de información climática proyectada de alta resolución en modelos hidrológicos,
          análisis SIG y procesos de investigación científica, promoviendo la
          reproducibilidad y el acceso abierto a los datos.
        </p>

        {/* ================= SERVICIOS ================= */}
        <h3>Servicios disponibles</h3>

        <table className="api_table">
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Método</th>
              <th>Descripción</th>
              <th>Formato</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>/api/</td>
              <td>GET</td>
              <td>Información general del servicio</td>
              <td>JSON</td>
            </tr>
            <tr>
              <td>/api/temperature/</td>
              <td>GET</td>
              <td>Datos horarios de temperatura en grilla lat–lon</td>
              <td>JSON</td>
            </tr>
            <tr>
              <td>/api/precipitation/</td>
              <td>GET</td>
              <td>Datos horarios de precipitación en grilla lat–lon</td>
              <td>JSON</td>
            </tr>
          </tbody>
        </table>

        <h3>Estructura de los datos</h3>

        <p>
          Los datos son retornados en una estructura matricial, donde las dimensiones
          espaciales están definidas por vectores de latitud y longitud, y la variable
          climática se representa como una matriz bidimensional.
        </p>
          
        <ul className='lista'>
          <li ><strong>time</strong>: Fecha y hora de la proyección climática</li>
          <li><strong>latitude</strong>: Vector de coordenadas de latitud</li>
          <li><strong>longitude</strong>: Vector de coordenadas de longitud</li>
          <li><strong>temperature / precipitation</strong>: Matriz [lat, lon]</li>
        </ul>

        <h3>Ejemplo de consulta</h3>

        <pre className="api_code">
        {`GET https://agranada.online/api/temperature/`}
        </pre>

        {/* ================= PARÁMETROS ================= */}
        

        {/* ================= EJEMPLO ================= */}
        

        <h3>Relación con el proceso de downscaling</h3>
        <p>
          Los datos expuestos a través de la API corresponden al producto final del
          proceso de downscaling estadístico, en el cual la información climática
          proveniente de modelos GCM y reanálisis ERA5-Land es transformada a una
          resolución espacial de 1 km mediante técnicas de inteligencia artificial, para la costa
          Pacífica del departamento de Valle del Cauca.
        </p>

        {/* ================= ACCESO ================= */}
        <h2>Acceso al servicio</h2>
        <p>
          El servicio se encuentra disponible en la siguiente dirección: 
        <a
          href="https://agranada.online/api/"
          target="_blank"
          rel="noopener noreferrer"
          className="api_link"
        >
          https://agranada.online/api/
        </a>
        </p>

      </article>
    </section>
  );
}

export default ApiPage;