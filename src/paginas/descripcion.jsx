import {
  FaReact,
  FaAws,
  FaPython
} from "react-icons/fa";

import {
  SiVite,
  SiMaplibre,
  SiDjango,
  SiApache,
  SiTensorflow,
  SiPytorch,
  SiNumpy,
  SiPandas
} from "react-icons/si";

import { IoAppsSharp } from "react-icons/io5";

import './descripcion.css'

function Tech({ icon, label }) {
  return (
    <div className="tech_item">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function DescripcionPage() {
  return (
    <section className="description_page">
      
      <header className="description_header">
        <h1>
          Downscaling estadístico a datos de temperatura
          y precipitación
        </h1>
        <p>
          Este trabajo de grado dispone datos de las variables climáticas proyectadas
          de temperatura y precipitación que sean de utilidad para la modelación
          hidrológica en el grupo de investigación GISMODEL, a partir de la integración
          de los escenarios climáticos de los Modelos de Circulación General (GCM)
          definidos en el IPCC6, usando técnicas de Inteligencia Artificial y
          herramientas geomáticas.
        </p>
      </header>

      <article className="description_content">
        
        <h2>Objetivo</h2>
        <p>
          Disponer información climática de temperatura y precipitación proyectada a
          una resolución espacio-temporal más apropiada para la cuenca del río Dagua,
          generada a partir de datos de GCM, ERA5-Land y observaciones locales,
          mediante el uso de técnicas de inteligencia artificial.
        </p>

        <h2>Funcionalidades principales</h2>
        <ul>
          <li>
            Visualización de datos de temperatura y precipitación a una escala
            espacial de 1 km y temporalidad horaria.
          </li>
          <li>
            Disponibilidad de datos proyectados hasta el año 2035 en los diferentes
            escenarios establecidos por el IPCC6.
          </li>
        </ul>

        <h2>Tecnologías utilizadas</h2>

        <div className="tech_section">

          <h3>SIG & Web</h3>
          <div className="tech_row">
            <Tech icon={<FaReact />} label="React" />
            <Tech icon={<SiVite />} label="Vite" />
            <Tech icon={<SiMaplibre />} label="MapLibre" />
            <Tech icon={<SiDjango />} label="Django" />
            <Tech icon={<SiApache />} label="XAMPP" />
            <Tech icon={<FaAws />} label="AWS" />
          </div>

          <h3> IA - ML</h3>
          <div className="tech_row">
            <Tech icon={<FaPython />} label="Python" />
            <Tech icon={<SiTensorflow />} label="TensorFlow" />
            <Tech icon={<SiNumpy />} label="PyNumpy" />
            <Tech icon={<SiPandas />} label="PyPandas" />
            <Tech icon={<IoAppsSharp />} label="netCDF" />
          </div>

        </div>

      </article>
    </section>
  );
}

export default DescripcionPage;