import React from 'react';

const SearchAndFilter = ({ 
  searchTerm, 
  onSearchChange, 
  filter, 
  onFilterChange, 
  onRefresh,
  onActivityUpdate 
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
      <input
        type="text"
        placeholder="Tìm kiếm phòng..."
        value={searchTerm}
        onChange={(e) => {
          onSearchChange(e.target.value);
          onActivityUpdate();
        }}
        className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
      />
      <div className="flex gap-2 sm:gap-4">
        <select
          value={filter}
          onChange={(e) => {
            onFilterChange(e.target.value);
            onActivityUpdate();
          }}
          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
        >
          <option value="all">Tất cả</option>
          <option value="waiting">Đang chờ</option>
          <option value="playing">Đang chơi</option>
          <option value="full">Đầy</option>
        </select>
        <button
          onClick={() => {
            onActivityUpdate();
            onRefresh();
          }}
          className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base whitespace-nowrap"
        >
          Làm mới
        </button>
      </div>
    </div>
  );
};

export default SearchAndFilter;
