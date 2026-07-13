import { useState, useEffect } from "react";
import { DashboardScouting } from "../Scouting/DashboardScouting";import "./Home.css";

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export function Home() {
  const [arbolDemos, setArbolDemos] = useState([]);
  const [menuAbierto, setMenuAbierto] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const [equipoAbierto, setEquipoAbierto] = useState(null);
  const [mapaAbierto, setMapaAbierto] = useState(null);

  const [pestanas, setPestanas] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState(null);

  const [modoApp, setModoApp] = useState('replay');
  const [demosSeleccionadas, setDemosSeleccionadas] = useState([]);

  useEffect(() => {
    const cargarCarpetas = async () => {
      setLoading(true);
      const data = await ipcRenderer.invoke('read-demos-folder');
      if (!data.error) {
        setArbolDemos(data);
      }
      setLoading(false);
    };
    cargarCarpetas();
  }, []);

  const abrirDemo = (archivo, equipo, mapa) => {
    const id = `${equipo}-${mapa}-${archivo.nombre}`;
    if (!pestanas.find(p => p.id === id)) {
      setPestanas([...pestanas, { id, nombre: archivo.nombre, url: archivo.rutaRelativa, tipo: '2d' }]);
    }
    setPestanaActiva(id);
  };

  const cerrarPestana = (e, id) => {
    e.stopPropagation();
    const nuevasPestanas = pestanas.filter(p => p.id !== id);
    setPestanas(nuevasPestanas);
    if (pestanaActiva === id) {
      setPestanaActiva(nuevasPestanas.length > 0 ? nuevasPestanas[nuevasPestanas.length - 1].id : null);
    }
  };

const toggleSeleccionDemo = (archivo, equipo, mapa) => {
    const id = `${equipo}-${mapa}-${archivo.nombre}`;
    const estaSeleccionada = demosSeleccionadas.some(d => d.id === id);

    if (estaSeleccionada) {
      setDemosSeleccionadas(demosSeleccionadas.filter(d => d.id !== id));
    } else {
      // 🚨 ELIMINADA LA RESTRICCIÓN DE CARPETA. 
      // Ahora puedes seleccionar cualquier mezcla, el Dashboard se encargará de validar.
      setDemosSeleccionadas([...demosSeleccionadas, { id, archivo, equipo, mapa }]);
    }
  };

  const generarReporte = () => {
    const idReporte = `reporte-${Date.now()}`;
    const nuevaPestana = {
      id: idReporte,
      nombre: `📊 Reporte (${demosSeleccionadas.length} Demos)`,
      tipo: 'dashboard',
      demos: demosSeleccionadas
    };
    setPestanas([...pestanas, nuevaPestana]);
    setPestanaActiva(idReporte);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>
      
      <div style={{ 
        width: menuAbierto ? '320px' : '0px', 
        overflowY: 'auto', overflowX: 'hidden', transition: 'width 0.3s', 
        backgroundColor: '#121212', borderRight: menuAbierto ? '1px solid #222' : 'none', flexShrink: 0
      }}>
        <div style={{ padding: '20px', minWidth: '320px' }}>
          <h3 style={{ color: '#00d2ff', margin: '0 0 20px 0', fontSize: '1.2rem' }}>📁 Explorador</h3>

          <div style={{ display: 'flex', backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '4px', marginBottom: '20px' }}>
            <button 
              onClick={() => { setModoApp('replay'); setDemosSeleccionadas([]); }}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
                backgroundColor: modoApp === 'replay' ? '#2a2a2a' : 'transparent',
                color: modoApp === 'replay' ? '#00d2ff' : '#666', transition: '0.2s'
              }}
            >
              📺 Replay 2D
            </button>
            <button 
              onClick={() => setModoApp('scouting')}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold',
                backgroundColor: modoApp === 'scouting' ? '#2a2a2a' : 'transparent',
                color: modoApp === 'scouting' ? '#ffb300' : '#666', transition: '0.2s'
              }}
            >
              📊 Scouting
            </button>
          </div>

          {modoApp === 'scouting' && (
            <button
              onClick={generarReporte}
              disabled={demosSeleccionadas.length === 0}
              style={{
                width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '6px', border: 'none',
                backgroundColor: demosSeleccionadas.length === 0 ? '#333' : '#ffb300',
                color: demosSeleccionadas.length === 0 ? '#777' : '#000',
                cursor: demosSeleccionadas.length === 0 ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase', transition: '0.2s'
              }}
            >
              Generar Reporte ({demosSeleccionadas.length})
            </button>
          )}
          
          {loading ? <p style={{color: '#555'}}>Cargando disco...</p> : arbolDemos.length === 0 ? <p style={{color: '#555'}}>No hay demos.</p> : null}

          {arbolDemos.map(equipo => (
            <div key={equipo.nombre} style={{ marginBottom: '10px' }}>
              <div 
                onClick={() => setEquipoAbierto(equipoAbierto === equipo.nombre ? null : equipo.nombre)}
                style={{ cursor: 'pointer', padding: '10px 15px', backgroundColor: '#1a1a1a', borderRadius: '6px', fontWeight: 'bold', border: '1px solid #222' }}
              >
                {equipoAbierto === equipo.nombre ? '📂' : '📁'} {equipo.nombre.toUpperCase()}
              </div>
              
              {equipoAbierto === equipo.nombre && equipo.mapas.map(mapa => (
                <div key={mapa.nombre} style={{ marginLeft: '15px', marginTop: '5px' }}>
                  <div 
                    onClick={() => setMapaAbierto(mapaAbierto === mapa.nombre ? null : mapa.nombre)}
                    style={{ cursor: 'pointer', padding: '8px 10px', color: '#aaa', fontSize: '0.95rem' }}
                  >
                    {mapaAbierto === mapa.nombre ? '🔽' : '▶️'} {mapa.nombre.toUpperCase()}
                  </div>

                  {mapaAbierto === mapa.nombre && mapa.archivos.map(archivo => {
                    const id = `${equipo.nombre}-${mapa.nombre}-${archivo.nombre}`;
                    const isSelected = demosSeleccionadas.some(d => d.id === id);

                    return (
                      <div 
                        key={archivo.nombre}
                        onClick={() => modoApp === 'scouting' ? toggleSeleccionDemo(archivo, equipo.nombre, mapa.nombre) : abrirDemo(archivo, equipo.nombre, mapa.nombre)}
                        style={{ 
                          marginLeft: '25px', padding: '8px 10px', cursor: 'pointer', color: '#ddd', fontSize: '0.85rem',
                          borderLeft: modoApp === 'scouting' && isSelected ? '3px solid #ffb300' : '3px solid #00d2ff', 
                          backgroundColor: isSelected && modoApp === 'scouting' ? '#2a2000' : '#151515', 
                          borderRadius: '0 6px 6px 0', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px',
                          transition: '0.2s'
                        }}
                      >
                        {modoApp === 'scouting' && (
                          <div style={{
                            width: '14px', height: '14px', border: `2px solid ${isSelected ? '#ffb300' : '#555'}`,
                            borderRadius: '3px', backgroundColor: isSelected ? '#ffb300' : 'transparent'
                          }}/>
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {archivo.nombre}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', backgroundColor: '#121212', alignItems: 'center', borderBottom: '1px solid #222' }}>
          <button 
            onClick={() => setMenuAbierto(!menuAbierto)}
            style={{ padding: '15px 20px', cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', borderRight: '1px solid #222' }}
          >
            ☰
          </button>
          
          <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
            {pestanas.map(p => (
              <div 
                key={p.id} 
                onClick={() => setPestanaActiva(p.id)}
                style={{ 
                  padding: '12px 20px', cursor: 'pointer', borderRight: '1px solid #222',
                  backgroundColor: pestanaActiva === p.id ? '#1e1e1e' : 'transparent',
                  borderBottom: pestanaActiva === p.id ? `2px solid ${p.tipo === 'dashboard' ? '#ffb300' : '#00d2ff'}` : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.9rem'
                }}
              >
                <span style={{ color: p.tipo === 'dashboard' ? '#ffb300' : '#fff' }}>{p.nombre}</span>
                <button 
                  onClick={(e) => cerrarPestana(e, p.id)}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#050505', position: 'relative' }}>
          {pestanas.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#333' }}>
              <h2>Selecciona una demo o genera un reporte para comenzar</h2>
            </div>
          ) : (
            pestanas.map(p => {
              if (p.tipo === 'dashboard') {
                return (
                  <div key={p.id} style={{ display: pestanaActiva === p.id ? 'block' : 'none', height: '100%' }}>
                    <DashboardScouting demos={p.demos} />
                  </div>
                )
              }

              const baseUrl = window.location.href.split('?')[0];
              const iframeSrc = `${baseUrl}?player=true&demourl=${encodeURIComponent(p.url)}`;
              return (
                <iframe 
                  key={p.id} src={iframeSrc} title={p.nombre}
                  style={{ width: '100%', height: '100%', border: 'none', display: pestanaActiva === p.id ? 'block' : 'none' }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}