import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TourViewer from './components/TourViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TourViewer />} />
        {/* En el futuro aquí podemos añadir /admin para editar los tours */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
