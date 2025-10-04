import React, { useEffect, useRef } from 'react';

const MoveHistory = ({ history }) => {
  const scrollContainerRef = useRef(null);
  const lastMoveRef = useRef(null);

  // Tự động cuộn xuống nước đi cuối cùng khi có nước đi mới
  useEffect(() => {
    if (history && history.length > 0 && lastMoveRef.current && scrollContainerRef.current) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        const lastMoveElement = lastMoveRef.current;
        
        if (container && lastMoveElement) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = lastMoveElement.getBoundingClientRect();
          
          // Chỉ cuộn nếu phần tử nằm ngoài viewport
          const isElementVisible = 
            elementRect.top >= containerRect.top && 
            elementRect.bottom <= containerRect.bottom;
          
          if (!isElementVisible) {
            const scrollTop = lastMoveElement.offsetTop - container.offsetTop - container.clientHeight + lastMoveElement.clientHeight + 10;
            container.scrollTo({
              top: Math.max(0, scrollTop),
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    }
  }, [history]);

  return (
    <div className="h-full min-h-0 max-h-[35vh] sm:max-h-full" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="bg-white rounded-lg shadow pt-2 sm:pt-3 px-3 sm:px-4 pb-3 sm:pb-4 h-full flex flex-col" style={{ minHeight: 0 }}>
        <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-gray-800 flex-shrink-0">Lịch sử nước đi</h3>
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
          style={{ minHeight: 0 }}
        >
          {history && history.length > 0 ? (
            history.map((move, index) => {
              const isX = move.mark === 'X';
              const isLastMove = index === history.length - 1;
              return (
                <div
                  key={index}
                  ref={isLastMove ? lastMoveRef : null}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-300 text-gray-700 font-bold text-xs">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm sm:text-base ${
                        isX ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {move.mark}
                      </span>
                      <span className="text-gray-600 text-xs sm:text-sm">
                        tại
                      </span>
                      <span className="font-mono text-xs sm:text-sm bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">
                        ({move.x}, {move.y})
                      </span>
                      {(move.nickname || move.username) && (
                        <span className="text-gray-500 text-xs sm:text-sm ml-auto">
                          {move.nickname || move.username}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-xs sm:text-sm">Chưa có nước đi nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoveHistory;
