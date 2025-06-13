import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn'; // 导入中文语言包
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// 设置语言为中文
dayjs.locale('zh-cn');

// 加载插件
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

export const formatDate = {
  // 格式化为 YYYY-MM-DD HH:mm:ss
  format: (date?: string | Date | null) => {
    if (!date) return '';
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  },

  // 格式化为相对时间（例如：3小时前）
  fromNow: (date?: string | Date | null) => {
    if (!date) return '';
    return dayjs(date).fromNow();
  },

  // 格式化为日期（YYYY-MM-DD）
  formatDate: (date?: string | Date | null) => {
    if (!date) return '';
    return dayjs(date).format('YYYY-MM-DD');
  },

  // 格式化为时间（HH:mm:ss）
  formatTime: (date?: string | Date | null) => {
    if (!date) return '';
    return dayjs(date).format('HH:mm:ss');
  },

  // 自定义格式化
  formatCustom: (date?: string | Date | null, format = 'YYYY-MM-DD HH:mm:ss') => {
    if (!date) return '';
    return dayjs(date).format(format);
  },

  // 判断是否是有效日期
  isValid: (date?: string | Date | null) => {
    if (!date) return false;
    return dayjs(date).isValid();
  },
};
