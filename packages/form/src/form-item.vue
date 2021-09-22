<template>
  <div class="el-form-item" :class="[{
      'el-form-item--feedback': elForm && elForm.statusIcon,
      'is-error': validateState === 'error',
      'is-validating': validateState === 'validating',
      'is-success': validateState === 'success',
      'is-required': isRequired || required,
      'is-no-asterisk': elForm && elForm.hideRequiredAsterisk
    },
    sizeClass ? 'el-form-item--' + sizeClass : ''
  ]">
    <label-wrap
      :is-auto-width="labelStyle && labelStyle.width === 'auto'"
      :update-all="form.labelWidth === 'auto'">
      <label :for="labelFor" class="el-form-item__label" :style="labelStyle" v-if="label || $slots.label">
        <slot name="label">{{label + form.labelSuffix}}</slot> // label填充的地方
      </label>
    </label-wrap>
    <div class="el-form-item__content" :style="contentStyle">
      <slot></slot> // el-form-item传入的标签插入到默认插槽
      <transition name="el-zoom-in-top">
        <slot
          v-if="validateState === 'error' && showMessage && form.showMessage"
          name="error"
          :error="validateMessage">
          // 表单校验失败的时候填充失败信息
          <div
            class="el-form-item__error"
            :class="{
              'el-form-item__error--inline': typeof inlineMessage === 'boolean'
                ? inlineMessage
                : (elForm && elForm.inlineMessage || false)
            }"
          >
            {{validateMessage}}
          </div>
        </slot>
      </transition>
    </div>
  </div>
</template>
<script>
  import AsyncValidator from 'async-validator';
  import emitter from 'element-ui/src/mixins/emitter';
  import objectAssign from 'element-ui/src/utils/merge';
  import { noop, getPropByPath } from 'element-ui/src/utils/util';
  import LabelWrap from './label-wrap';
  export default {
    name: 'ElFormItem',

    componentName: 'ElFormItem',

    mixins: [emitter], // 混入一个自定义的方法

    provide() {
      return {
        elFormItem: this
      };
    },

    inject: ['elForm'],

    props: {
      label: String,
      labelWidth: String,
      prop: String, // form-item 用户传入的prop 这个prop是用来取rules中查找对应规则的
      required: {
        type: Boolean,
        default: undefined
      },
      rules: [Object, Array], // form-item 用户传入的rules
      error: String,
      validateStatus: String,
      for: String,
      inlineMessage: {
        type: [String, Boolean],
        default: ''
      },
      showMessage: {
        type: Boolean,
        default: true
      },
      size: String
    },
    components: {
      // use this component to calculate auto width
      LabelWrap
    },
    watch: {
      error: {
        immediate: true,
        handler(value) {
          this.validateMessage = value;
          this.validateState = value ? 'error' : '';
        }
      },
      validateStatus(value) {
        this.validateState = value;
      }
    },
    computed: {
      labelFor() {
        return this.for || this.prop;
      },
      labelStyle() {
        const ret = {};
        if (this.form.labelPosition === 'top') return ret;
        const labelWidth = this.labelWidth || this.form.labelWidth;
        if (labelWidth) {
          ret.width = labelWidth;
        }
        return ret;
      },
      contentStyle() {
        const ret = {};
        const label = this.label;
        if (this.form.labelPosition === 'top' || this.form.inline) return ret;
        if (!label && !this.labelWidth && this.isNested) return ret;
        const labelWidth = this.labelWidth || this.form.labelWidth;
        if (labelWidth === 'auto') {
          if (this.labelWidth === 'auto') {
            ret.marginLeft = this.computedLabelWidth;
          } else if (this.form.labelWidth === 'auto') {
            ret.marginLeft = this.elForm.autoLabelWidth;
          }
        } else {
          ret.marginLeft = labelWidth;
        }
        return ret;
      },
      // this.form时拿到el-form组件实例
      form() {
        // 拿到form-item的父元素
        let parent = this.$parent;
        // 拿到父元素的组件名
        let parentName = parent.$options.componentName;
        // 找到el-form组件
        while (parentName !== 'ElForm') {
          // 如果父元素是el-form-item，标记该el-form-item是被嵌套的el-form-item
          if (parentName === 'ElFormItem') {
            this.isNested = true;
          }
          // 找到该父元素的父元素
          parent = parent.$parent;
          // 找到该父元素的父元素
          parentName = parent.$options.componentName;
        }
        // 返回el-form组件实例
        return parent;
      },
      fieldValue() { // 拿到prop对应的model数据
        const model = this.form.model;
        if (!model || !this.prop) { return; }

        let path = this.prop;
        if (path.indexOf(':') !== -1) {
          path = path.replace(/:/, '.');
        }

        return getPropByPath(model, path, true).v;
      },
      isRequired() {
        // 拿到合并后的规则
        let rules = this.getRules();
        let isRequired = false;
        // 检查规则
        if (rules && rules.length) {
          // 只要规则中有一项是必填的就标记为是必填的
          rules.every(rule => {
            if (rule.required) {
               // 找到一个规则是必填的就停止查找
              isRequired = true;
              return false;
            }
            return true;
          });
        }
        // 返回是否是必填的
        return isRequired;
      },
      _formSize() {
        return this.elForm.size;
      },
      elFormItemSize() {
        return this.size || this._formSize;
      },
      sizeClass() {
        return this.elFormItemSize || (this.$ELEMENT || {}).size;
      }
    },
    data() {
      return {
        validateState: '',
        validateMessage: '',
        validateDisabled: false,
        validator: {},
        isNested: false,
        computedLabelWidth: ''
      };
    },
    methods: {
      // el-form调用，或者form-item自身被用户调用validate，校验的触发方法
      validate(trigger, callback = noop) {
        this.validateDisabled = false;
        // 根据对应用户传入的trigger拿到对应form-item上设置的Prop对应的rule中对应rule的trigger的rule
        const rules = this.getFilteredRule(trigger);
        // 如果没有找到规则，校验直接通过
        if ((!rules || rules.length === 0) && this.required === undefined) {
          callback();
          return true;
        }

        this.validateState = 'validating';

        const descriptor = {};
        // 删除掉对应的trigger
        if (rules && rules.length > 0) {
          rules.forEach(rule => {
            delete rule.trigger;
          });
        }
        // 在这form-item的prop中注册对应的rules
        descriptor[this.prop] = rules;
        // 把这个规则传入validator进行校验
        const validator = new AsyncValidator(descriptor);
        // 在model对象中注册form-item的prop对应form-item对应的该字段的值
        const model = {};
         // 在model对象中注册form-item的prop对应form-item对应的该字段的值
        model[this.prop] = this.fieldValue;
         // 使用校验器，校验model与descritor
        validator.validate(model, { firstFields: true }, (errors, invalidFields) => {
          this.validateState = !errors ? 'success' : 'error'; // errors不存在说明校验通过，否则就是校验失败
          this.validateMessage = errors ? errors[0].message : ''; // errors存在拿到校验后的错误消息
          // 将校验结果与无效字段传给回调
          callback(this.validateMessage, invalidFields);
          // 调用el-form实例组件上的validate方法将form-item上的prop，校验结果，包装后的错误结果传递给el-form
          this.elForm && this.elForm.$emit('validate', this.prop, !errors, this.validateMessage || null);
        });
      },
      clearValidate() {
        this.validateState = '';
        this.validateMessage = '';
        this.validateDisabled = false;
      },
      resetField() {
        this.validateState = '';
        this.validateMessage = '';

        let model = this.form.model;
        let value = this.fieldValue; // 拿到el-form上用户传入的model,form-item传入的对应prop对应el-form上的model中相对应的数据值
        let path = this.prop;
        if (path.indexOf(':') !== -1) {
          path = path.replace(/:/, '.');
        }

        let prop = getPropByPath(model, path, true);

        this.validateDisabled = true;
        if (Array.isArray(value)) {
          prop.o[prop.k] = [].concat(this.initialValue);
        } else {
          prop.o[prop.k] = this.initialValue;
        }

        // reset validateDisabled after onFieldChange triggered
        this.$nextTick(() => {
          this.validateDisabled = false;
        });

        this.broadcast('ElTimeSelect', 'fieldReset', this.initialValue);
      },
      // 将form-item上的rules与form上的rules进行合并把是否必传的规则也进行合并
      getRules() {
        // 拿到el-form组件实例上的rules，也就是用户传入的rules
        let formRules = this.form.rules;
        // 用户传入的rules，也就是form-item自身的rules
        const selfRules = this.rules;
        // 
        const requiredRule = this.required !== undefined ? { required: !!this.required } : [];
        // 从form-item中传入的prop 取 rules中查找对应的rule
        const prop = getPropByPath(formRules, this.prop || '');
        // prop.o里面存放的是prop对应的规则，prop.o里面存放的是对应path层级的rules对象，如果拿到就去拿prop.v，总之是拿到对应form-item传入的Prop对应的rules校验规则
        formRules = formRules ? (prop.o[this.prop || ''] || prop.v) : [];
        // 最后将form-item上的rules与form上的rules进行合并把是否必传的规则也进行合并
        return [].concat(selfRules || formRules || []).concat(requiredRule);
      },
      // 过滤出相应trigger的rule
      getFilteredRule(trigger) {
        // 拿到合并后的rules，包括了form-item上对应prop上的rules和自身设置的rules
        const rules = this.getRules();
        // 对rules进行过滤
        return rules.filter(rule => {
          // trigger没填的情况过滤出来
          if (!rule.trigger || trigger === '') return true;
          // trigger如果是个数组
          if (Array.isArray(rule.trigger)) {
            // 找到rule中对应trigger
            return rule.trigger.indexOf(trigger) > -1;
          } else {
            // 找到对应trigger的规则
            return rule.trigger === trigger;
          }
        }).map(rule => objectAssign({}, rule)); // 将对应过滤的规则拷贝到一个新的对象中，返回一个新的list
      },
      // trigger为blur时的校验
      onFieldBlur() {
        this.validate('blur');
      },
      // trigger为change时的校验
      onFieldChange() {
        if (this.validateDisabled) {
          this.validateDisabled = false;
          return;
        }
        this.validate('change');
      },
      updateComputedLabelWidth(width) {
        this.computedLabelWidth = width ? `${width}px` : '';
      },
      addValidateEvents() {
        // 拿到rules
        const rules = this.getRules();
        // required存在绑定事件
        if (rules.length || this.required !== undefined) {
         // vm.$on('test', function (msg) {
         //    console.log(msg)
         //  })
        //  vm.$emit('test', 'hi')
        // => "hi"
        // 监听form组件发送的事件
          this.$on('el.form.blur', this.onFieldBlur);
          this.$on('el.form.change', this.onFieldChange);
        }
      },
      removeValidateEvents() {
        // vm.$off( [event, callback] )
        // 移除自定义事件监听器。
        // 如果没有提供参数，则移除所有的事件监听器；
        this.$off();
      }
    },
    mounted() {
      // 当用户传入prop时，向el-form传递form-item组件实例
      if (this.prop) {
        this.dispatch('ElForm', 'el.form.addField', [this]);
        // 根据el-form上传入的Model从form-item中的prop中去el-form的model中找到对应的数据值
        let initialValue = this.fieldValue;
        if (Array.isArray(initialValue)) {
          initialValue = [].concat(initialValue);
        }
        // form-item.initialValue设置成响应式属性
        Object.defineProperty(this, 'initialValue', {
          value: initialValue
        });
        // 添加校验事件
        this.addValidateEvents();
      }
    },
    beforeDestroy() {
      // 销毁的时候向el-form发送销毁实例的事件
      this.dispatch('ElForm', 'el.form.removeField', [this]);
    }
  };
</script>
