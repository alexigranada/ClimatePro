import './NavBar.css'
import { NavLink } from "react-router-dom"

function NavBar() {
    return(
        <div className="navbar">
            <p>
                <NavLink to="/">ClimatePro</NavLink>
                <NavLink to="descripcion">descripción</NavLink>
                <NavLink to="api">API</NavLink> 
            </p>

            <div>
                <a>A. Granada | Área de Geomática | 2024</a> {/**&nbsp; */}
                {/*<a>2024</a>*/}
            </div>
        </div>
    )
}

export default NavBar;