import Picker from '../picker';
import TimePanel from '../panel/time';
import TimeRangePanel from '../panel/time-range';


// 格式	含义	备注	举例
// yyyy	年		2017
// M	月	不补0	1
// MM	月		01
// W	周	仅周选择器的 format 可用；不补0	1
// WW	周	仅周选择器的 format 可用	01
// d	日	不补0	2
// dd	日		02
// H	小时	24小时制；不补0	3
// HH	小时	24小时制	03
// h	小时	12小时制，须和 A 或 a 使用；不补0	3
// hh	小时	12小时制，须和 A 或 a 使用	03
// m	分钟	不补0	4
// mm	分钟		04
// s	秒	不补0	5
// ss	秒		05
// A	AM/PM	仅 format 可用，大写	AM
// a	am/pm	仅 format 可用，小写	am
// timestamp	JS时间戳	仅 value-format 可用；组件绑定值为number类型	1483326245000
// [MM]	不需要格式化字符	使用方括号标识不需要格式化的字符 (如 [A] [MM])	MM

export default {
  mixins: [Picker], // 混入了一个组件

  name: 'ElTimePicker',

  props: {
    isRange: Boolean, // 是否为时间范围选择，仅对<el-time-picker>有效
    arrowControl: Boolean // 是否使用箭头进行时间选择，仅对<el-time-picker>有效
  },

  data() {
    return {
      type: ''
    };
  },

  watch: {
    isRange(isRange) {
      // 
      if (this.picker) {
        this.unmountPicker(); 
        this.type = isRange ? 'timerange' : 'time';
        this.panel = isRange ? TimeRangePanel : TimePanel;
        this.mountPicker();
      } else {
        this.type = isRange ? 'timerange' : 'time';
        this.panel = isRange ? TimeRangePanel : TimePanel;
      }
    }
  },

  created() {
    // 
    this.type = this.isRange ? 'timerange' : 'time';
    this.panel = this.isRange ? TimeRangePanel : TimePanel;
  }
};
