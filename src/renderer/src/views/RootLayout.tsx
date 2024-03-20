import { Outlet } from 'react-router-dom';
import { FC, useEffect } from 'react';
import useAppStore from '../stores/useAppStore';
import { useViewportSize } from '@renderer/hooks/useViewPortSize';
import { AppBar } from '@renderer/components/AppBar';

export const RootLayout: FC = () => {
  const { height } = useViewportSize();
  const updateHeight = useAppStore(state => state.updateHeight);

  useEffect(() => {
    updateHeight(height);
  }, [height]);

  return (
    <div className="flex flex-col w-full h-full">
      <div className="w-full h-20">
        <AppBar />
      </div>
      <main className="w-full h-full">
        <Outlet />
      </main>
    </div>
  );
}
