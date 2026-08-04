import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '../components/ui';

export const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ backgroundColor: 'var(--bg-page)' }}>
    <Compass className="w-10 h-10 text-stone-600" />
    <div>
      <h1 className="text-lg font-semibold text-stone-200">This page does not exist</h1>
      <p className="text-sm text-stone-500 mt-1">The link may be out of date.</p>
    </div>
    <Link to="/dashboard">
      <Button>Back to the dashboard</Button>
    </Link>
  </div>
);

export default NotFound;
