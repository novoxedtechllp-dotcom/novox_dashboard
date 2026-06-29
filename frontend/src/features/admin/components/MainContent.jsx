import React from 'react';
import LowerContent from '../../../components/LowerContent';

const MainContent = ({ activeTab, employees = [] }) => {
  return (
    <div className="p-[24px] flex flex-col gap-[24px] w-full">
      <LowerContent employees={employees} />
    </div>
  );
};

export default MainContent;
