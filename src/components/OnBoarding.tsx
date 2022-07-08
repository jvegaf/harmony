import React from 'react';
import useAppState from '../hooks/useAppState';

const OnBoarding: React.FC = () => {
  const { onOpenFolder } = useAppState();

  return (
    <div className="h-full flex items-center justify-center bg-neutral-600">
      <div className="h-5/6 w-5/6 border border-slate-400 rounded bg-neutral-500 outline-offset-[-10px] outline-dashed outline-2 outline-slate-400 flex items-center justify-center">
        <button
          onClick={onOpenFolder}
          className="bg-blue-500 rounded py-2 px-4 mr-10 focus:outline-none shadow hover:bg-blue-200"
        >
          Open Folder
        </button>
      </div>
    </div>
  );
};

export default OnBoarding;
