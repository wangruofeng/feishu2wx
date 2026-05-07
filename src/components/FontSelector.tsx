import React from 'react';
import './FontSelector.css';

interface Props {
  font: string;
  setFont: (font: string) => void;
}

// 免费无版权的字体列表
const fonts = [
  { key: 'default', name: '默认字体', value: `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif` },
  { key: 'microsoft-yahei', name: '微软雅黑', value: `"Microsoft YaHei", "微软雅黑", Arial, sans-serif` },
  { key: 'simsun', name: '宋体', value: `SimSun, "宋体", serif` },
  { key: 'simhei', name: '黑体', value: `SimHei, "黑体", sans-serif` },
  { key: 'arial', name: 'Arial', value: `Arial, sans-serif` },
  { key: 'helvetica', name: 'Helvetica', value: `Helvetica, Arial, sans-serif` },
  { key: 'times', name: 'Times New Roman', value: `"Times New Roman", Times, serif` },
  { key: 'georgia', name: 'Georgia', value: `Georgia, serif` },
  { key: 'verdana', name: 'Verdana', value: `Verdana, sans-serif` },
  { key: 'courier', name: 'Courier New', value: `"Courier New", Courier, monospace` },
  { key: 'roboto', name: 'Roboto', value: `"Roboto", -apple-system, BlinkMacSystemFont, sans-serif` },
  { key: 'open-sans', name: 'Open Sans', value: `"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif` },
  { key: 'lato', name: 'Lato', value: `"Lato", -apple-system, BlinkMacSystemFont, sans-serif` },
  { key: 'montserrat', name: 'Montserrat', value: `"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif` },
  { key: 'raleway', name: 'Raleway', value: `"Raleway", -apple-system, BlinkMacSystemFont, sans-serif` },
  { key: 'poppins', name: 'Poppins', value: `"Poppins", -apple-system, BlinkMacSystemFont, sans-serif` },
];

const FontSelector: React.FC<Props> = ({ font, setFont }) => {
  return (
    <div className="font-selector">
      <span className="font-label">字体：</span>
      <select
        className="font-select"
        value={font}
        onChange={(e) => setFont(e.target.value)}
        title="选择字体"
      >
        {fonts.map((f) => (
          <option key={f.key} value={f.key}>
            {f.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FontSelector;

// 导出字体配置供其他组件使用
export { fonts };
