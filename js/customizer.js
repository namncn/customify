(
  function ($, exports, wp) {
    const api = wp.customize
    const $document = $(document)

    // when the customizer is ready prepare our fields events
    api.bind('ready', function () {
      let timeout = null

      // Create a stack of callbacks bound to parent settings to be able to unbind them
      // when altering the connected_fields attribute.
      if (typeof window.connectedFieldsCallbacks === 'undefined') {
        window.connectedFieldsCallbacks = {}
      }

      // add ace editors
      $('.customify_ace_editor').each(function (key, el) {
        const id = $(this).attr('id'),
          cssEditorInstance = ace.edit(id)

        const editor_type = $(this).data('editor_type')
        // init the ace editor
        cssEditorInstance.setTheme('ace/theme/github')
        cssEditorInstance.getSession().setMode('ace/mode/' + editor_type)

        // hide the textarea and enable the ace editor
        const textarea = $('#' + id + '_textarea').hide()
        cssEditorInstance.getSession().setValue(textarea.val())

        // each time a change is triggered start a timeout of 1,5s and when is finished refresh the previewer
        // if the user types faster than this delay then reset it
        cssEditorInstance.getSession().on('change', function (e) {
          if (timeout !== null) {
            clearTimeout(timeout)
            timeout = null
          } else {
            timeout = setTimeout(function () {
              textarea.val(cssEditorInstance.getSession().getValue())
              textarea.trigger('change')
            }, 1500)
          }
        })
      })

      // simple select2 field
      $('.customify_select2').select2()

      setTimeout(function () {
        CustomifyFontSelectFields.init()
      }, 333)

      prepare_typography_field()

      /**
       * Make the customizer save on CMD/CTRL+S action
       * This is awesome!!!
       */
      $(window).bind('keydown', function (event) {
        if (event.ctrlKey || event.metaKey) {
          if (String.fromCharCode(event.which).toLowerCase() === 's') {
            event.preventDefault()
            api.previewer.save()
          }
        }
      })

      // for each range input add a value preview output
      $('.accordion-section-content[id*="' + customify_settings.options_name + '"], #sub-accordion-section-style_manager_section').each(function () {

        // Initialize range fields logic
        customifyHandleRangeFields(this)
      })

      $document.on('change', '.customify_typography_font_subsets', function (ev) {

        const $input = $(this).parents('.options').siblings('.customify_typography').children('.customify_typography_values')
        let currentValue = $input.val()

        currentValue = JSON.parse(decodeURIComponent(currentValue))

        //maybe the selected option holds a JSON in its value
        currentValue.selected_subsets = maybeJsonParse($(this).val())

        $input.val(encodeURIComponent(JSON.stringify(currentValue)))

        $input.trigger('change')
      })

      $document.on('change', '.customify_typography_font_weight', function (ev) {

        const $input = $(this).parents('.options').siblings('.customify_typography').children('.customify_typography_values')
        let currentValue = $input.val()

        currentValue = maybeJsonParse(currentValue)
        // @todo currently the font weight selector works for one value only
        // maybe make this a multiselect

        //maybe the selected option holds a JSON in its value
        currentValue.selected_variants = {0: maybeJsonParse($(this).val())}

        $input.val(encodeURIComponent(JSON.stringify(currentValue)))
        $input.trigger('change')
      })

      $('body').on('customify:preset-change', function (e) {
        const data = $(e.target).data('options')

        if (!_.isUndefined(data)) {
          $.each(data, function (setting_id, value) {
            api_set_setting_value(setting_id, value)
          })
        }
      })

      $document.on('change', 'select.js-customify-preset', function () {
        const $source = $(this)
        const $target = $source.children('[value="' + $source.val() + '"]')
        $target.trigger('customify:preset-change')
      })

      $document.on('click', '.js-customify-preset input', function () {
        $(this).trigger('customify:preset-change')
      })

      customifyBackgroundJsControl.init()

      // sometimes a php save may be needed
      if (getUrlVars('save_customizer_once')) {
        api.previewer.save()
      }

      setTimeout(function () {
        customifyFoldingFields()
      }, 1000)

      // Handle reset buttons
      handleResetButtons()

      // Handle the section tabs (ex: Layout | Fonts | Colors)
      handleSectionTabs()
      handleFontPopupToggle()

      // Bind any connected fields, except those in the Style Manager.
      // Those are handled by the appropriate Style Manager component (Color Palettes, Font Palettes, etc ).
      bindConnectedFields()
    })

    function handleResetButtons () {
      const showResetButtons = $('button[data-action="reset_customify"]').length > 0

      if (showResetButtons) {
        createResetPanelButtons()
        createResetSectionButtons()

        $document.on('click', '.js-reset-panel', onResetPanel)
        $document.on('click', '.js-reset-section', onResetSection)
        $document.on('click', '#customize-control-reset_customify button', onReset)
      }
    }

    function handleFontPopupToggle () {
      const $allCheckboxes = $('.js-font-option-toggle')
      // Close a font field when clicking on another field
      $allCheckboxes.on('click', function () {
        const $checkbox = $(this)
        if ($checkbox.prop('checked') === true) {
          $allCheckboxes.not($checkbox).prop('checked', false)
        }
      })
    }

    function createResetPanelButtons () {

      $('.panel-meta').each(function (i, obj) {
        const $this = $(obj)
        const container = $this.parents('.control-panel')
        let id = container.attr('id')

        if (typeof id !== 'undefined') {
          id = id.replace('sub-accordion-panel-', '')
          id = id.replace('accordion-panel-', '')
          const $buttonWrapper = $('<li class="customize-control customize-control-reset"></li>')
          const $button = $('<button class="button js-reset-panel" data-panel="' + id + '"></button>')

          $button.text('Panel\'s defaults').appendTo($buttonWrapper)
          $this.parent().append($buttonWrapper)
        }
      })
    }

    function createResetSectionButtons () {
      $('.accordion-section-content').each(function (el, key) {
        const $this = $(this)
        const sectionID = $this.attr('id')

        if (_.isUndefined(sectionID) || sectionID.indexOf(customify_settings.options_name) === -1) {
          return
        }

        const id = sectionID.replace('sub-accordion-section-', '')
        const $button = $('<button class="button js-reset-section" data-section="' + id + '"></button>')
        const $buttonWrapper = $('<li class="customize-control customize-control-reset"></li>')

        $button.text('Reset All Options for This Section')
        $buttonWrapper.append($button)

        $this.append($buttonWrapper)
      })
    }

    function onReset (ev) {
      ev.preventDefault()

      const iAgree = confirm('Do you really want to reset to defaults all the fields? Watch out, this will reset all your Customify options and will save them!')

      if (!iAgree) {
        return
      }

      $.each(api.settings.controls, function (key, ctrl) {
        const settingID = key.replace('_control', '')
        const setting = customify_settings.settings[settingID]

        if (!_.isUndefined(setting) && !_.isUndefined(setting.default)) {
          api_set_setting_value(settingID, setting.default)
        }
      })

      api.previewer.save()
    }

    function onResetPanel (e) {
      e.preventDefault()

      const panelID = $(this).data('panel'),
        panel = api.panel(panelID),
        sections = panel.sections(),
        iAgree = confirm('Do you really want to reset ' + panel.params.title + '?')

      if (!iAgree) {
        return
      }
      if (sections.length > 0) {
        $.each(sections, function () {
          const controls = this.controls()

          if (controls.length > 0) {
            $.each(controls, function (key, ctrl) {
              const setting_id = ctrl.id.replace('_control', ''),
                setting = customify_settings.settings[setting_id]

              if (!_.isUndefined(setting) && !_.isUndefined(setting.default)) {
                api_set_setting_value(setting_id, setting.default)
              }
            })
          }
        })
      }
    }

    function onResetSection (e) {
      e.preventDefault()

      const sectionID = $(this).data('section'),
        section = api.section(sectionID),
        controls = section.controls()

      const iAgree = confirm('Do you really want to reset ' + section.params.title + '?')

      if (!iAgree) {
        return
      }

      if (controls.length > 0) {
        $.each(controls, function (key, ctrl) {
          const setting_id = ctrl.id.replace('_control', ''),
            setting = customify_settings.settings[setting_id]

          if (!_.isUndefined(setting) && !_.isUndefined(setting.default)) {
            api_set_setting_value(setting_id, setting.default)
          }
        })
      }
    }

    function handleSectionTabs () {
      const $navs = $('.js-section-navigation')

      $navs.each(function () {
        const $nav = $(this)
        const $title = $nav.parents('.accordion-section-content').find('.customize-section-title')
        const $parent = $nav.closest('.customize-control')

        $nav.appendTo($title)
        $title.parent().addClass('has-nav')
        $parent.addClass('screen-reader-text')
      })

      $('.js-section-navigation a').on('click', function (e) {
        e.preventDefault()

        const $this = $(this)
        const $sidebar = $this.parents('.wp-full-overlay-sidebar-content')
        const $parent = $this.parents('.accordion-section-content')
        const href = $this.attr('href')

        if (href != '#') {
          const actionsHeight = $('#customize-header-actions').outerHeight()
          const titleHeight = $parent.find('.customize-section-title').outerHeight()
          const $target = $(href)
          const offset = $target.position().top

          $sidebar.animate({scrollTop: offset - titleHeight - actionsHeight}, 500)
        }
      })
    }

    const getConnectedFieldsCallback = function (parent_setting_data, parent_setting_id) {
      return function (new_value, old_value) {
        _.each(parent_setting_data.connected_fields, function (connected_field_data) {
          if (_.isUndefined(connected_field_data) || _.isUndefined(connected_field_data.setting_id) || !_.isString(connected_field_data.setting_id)) {
            return
          }
          const setting = api(connected_field_data.setting_id)
          if (_.isUndefined(setting)) {
            return
          }
          setting.set(new_value)
        })
      }
    }

    const bindConnectedFields = function () {
      _.each(api.settings.settings, function (parent_setting_data, parent_setting_id) {
        // We don't want to handle the binding of the Style Manager settings
        if (typeof ColorPalettes !== 'undefined'
          && typeof ColorPalettes.masterSettingIds !== 'undefined'
          && _.contains(ColorPalettes.masterSettingIds, parent_setting_id)) {
          return
        }
        if (typeof FontPalettes !== 'undefined'
          && typeof FontPalettes.masterSettingIds !== 'undefined'
          && _.contains(FontPalettes.masterSettingIds, parent_setting_id)) {
          return
        }

        let parent_setting = api(parent_setting_id)
        if (typeof parent_setting_data.connected_fields !== 'undefined') {
          connectedFieldsCallbacks[parent_setting_id] = getConnectedFieldsCallback(parent_setting_data, parent_setting_id)
          parent_setting.bind(connectedFieldsCallbacks[parent_setting_id])
        }
      })
    }

    const customifyHandleRangeFields = function (el) {

      // For each range input add a number field (for preview mainly - but it can also be used for input)
      $(el).find('input[type="range"]').each(function () {
        let $range = $(this),
          $number = $range.siblings('.range-value')

        if (!$number.length) {
          $number = $range.clone()

          $number
            .attr('type', 'number')
            .attr('class', 'range-value')
            .removeAttr('data-field')

          if ( $range.first().attr('id') ) {
            $number.attr('id', $range.first().attr('id')+'_number')
          }
          $number.insertAfter($range)
        }

        function hasValidValue ($input) {
          const min = $input.attr('min')
          const max = $input.attr('max')
          const value = $input.val()

          if (typeof min !== 'undefined' && parseFloat(min) > parseFloat(value)) {
            return false
          }

          return !(typeof max !== 'undefined' && parseFloat(max) < parseFloat(value))
        }

        $range.on('input', function () {
          $number.val($range.val())
        })

        $number.on('blur', function () {
          if (!hasValidValue($number)) {
            $number.val($range.val())
            shake($number)
          } else {
            $range.val($number.val())
          }
        })

        function shake ($field) {
          $field.addClass('input-shake input-error')
          $field.one('animationend', function () {
            $field.removeClass('input-shake input-error')
          })
        }
      })
    }

    /**
     * This function will search for all the interdependend fields and make a bound between them.
     * So whenever a target is changed, it will take actions to the dependent fields.
     * @TODO  this is still written in a barbaric way, refactor when needed
     */
    const customifyFoldingFields = function () {

      if (_.isUndefined(customify_settings) || _.isUndefined(customify_settings.settings)) {
        return // bail
      }

      $.fn.reactor.defaults.compliant = function () {
        $(this).slideDown()
        // $(this).animate({opacity: 1});
        $(this).find(':disabled').attr({disabled: false})
      }

      $.fn.reactor.defaults.uncompliant = function () {
        $(this).slideUp()
        // $(this).animate({opacity: 0.25});
        $(this).find(':enabled').attr({disabled: true})
      }

      let IS = $.extend({}, $.fn.reactor.helpers)

      let bind_folding_events = function (parent_id, field, relation) {

        let key = null

        if (_.isString(field)) {
          key = field
        } else if (!_.isUndefined(field.id)) {
          key = field.id
        } else if (_.isString(field[0])) {
          key = field[0]
        } else {
          return // no key, no fun
        }

        let value = 1, // by default we use 1 the most used value for checkboxes or inputs
          between = [0, 1] // can only be `show` or `hide`

        const target_key = customify_settings.options_name + '[' + key + ']'
        const target_type = customify_settings.settings[target_key].type

        // we support the usual syntax like a config array like `array( 'id' => $id, 'value' => $value, 'compare' => $compare )`
        // but we also support a non-associative array like `array( $id, $value, $compare )`
        if (!_.isUndefined(field.value)) {
          value = field.value
        } else if (!_.isUndefined(field[1]) && !_.isString(field[1])) {
          value = field[1]
        }

        if (!_.isUndefined(field.between)) {
          between = field.between
        }

        /**
         * Now for each target we have, we will bind a change event to hide or show the dependent fields
         */
        const target_selector = '[data-customize-setting-link="' + customify_settings.options_name + '[' + key + ']"]'

        switch (target_type) {
          case 'checkbox':
            $(parent_id).reactIf(target_selector, function () {
              return $(this).is(':checked') == value
            })
            break

          case 'radio':
          case 'sm_radio':
          case 'sm_switch':
          case 'radio_image':
          case 'radio_html':

            // in case of an array of values we use the ( val in array) condition
            if (_.isObject(value)) {
              value = _.toArray(value)
              $(parent_id).reactIf(target_selector, function () {
                return (
                  value.indexOf($(target_selector + ':checked').val()) !== -1
                )
              })
            } else { // in any other case we use a simple == comparison
              $(parent_id).reactIf(target_selector, function () {
                return $(target_selector + ':checked').val() == value
              })
            }
            break

          case 'range':
            const x = IS.Between(between[0], between[1])

            $(parent_id).reactIf(target_selector, x)
            break

          default:
            // in case of an array of values we use the ( val in array) condition
            if (_.isObject(value)) {
              value = _.toArray(value)
              $(parent_id).reactIf(target_selector, function () {
                return (
                  value.indexOf($(target_selector).val()) !== -1
                )
              })
            } else { // in any other case we use a simple == comparison
              $(parent_id).reactIf(target_selector, function () {
                return $(target_selector).val() == value
              })
            }
            break
        }

        $(target_selector).trigger('change')
        $('.reactor').trigger('change.reactor') // triggers all events on load
      }

      $.each(customify_settings.settings, function (id, field) {
        /**
         * Here we have the id of the fields. but we know for sure that we just need his parent selector
         * So we just create it
         */
        let parent_id = id.replace('[', '-')
        parent_id = parent_id.replace(']', '')
        parent_id = '#customize-control-' + parent_id + '_control'

        // get only the fields that have a 'show_if' property
        if (field.hasOwnProperty('show_if')) {
          let relation = 'AND'

          if (!_.isUndefined(field.show_if.relation)) {
            relation = field.show_if.relation
            // remove the relation property, we need the config to be array based only
            delete field.show_if.relation
          }

          /**
           * The 'show_if' can be a simple array with one target like: [ id, value, comparison, action ]
           * Or it could be an array of multiple targets and we need to process both cases
           */

          if (!_.isUndefined(field.show_if.id)) {
            bind_folding_events(parent_id, field.show_if, relation)
          } else if (_.isObject(field.show_if)) {
            $.each(field.show_if, function (i, j) {
              bind_folding_events(parent_id, j, relation)
            })
          }
        }
      })
    }

    // get each typography field and bind events
    // @todo Are we still using the typography field since we have the font field?
    // Yes we do, in older themes.
    const prepare_typography_field = function () {
      const $typos = $('.customify_typography_font_family')

      $typos.each(function () {
        const font_family_select = this,
          $input = $(font_family_select).siblings('.customify_typography_values')
        // on change
        $(font_family_select).on('change', function () {
          update_siblings_selects(font_family_select)
          $input.trigger('change')
        })
        update_siblings_selects(font_family_select)
      })
    }

    const api_set_setting_value = function (setting_id, value) {
      let setting = api(setting_id),
        field = $('[data-customize-setting-link="' + setting_id + '"]'),
        field_class = $(field).parent().attr('class')

      // Legacy field type
      if (!_.isUndefined(field_class) && field_class === 'customify_typography') {

        let family_select = field.siblings('select')

        if (_.isString(value)) {
          let this_option = family_select.find('option[value="' + value + '"]')
          $(this_option[0]).attr('selected', 'selected')
          update_siblings_selects(family_select)
        } else if (_.isObject(value)) {
          let this_family_option = family_select.find('option[value="' + value['font_family'] + '"]')

          $(this_family_option[0]).attr('selected', 'selected')

          update_siblings_selects(this_family_option)

          setTimeout(function () {
            let weight_select = field.parent().siblings('.options').find('.customify_typography_font_weight'),
              this_weight_option = weight_select.find('option[value="' + value['selected_variants'] + '"]')

            $(this_weight_option[0]).attr('selected', 'selected')

            update_siblings_selects(this_family_option)

            weight_select.trigger('change')
          }, 300)
        }

        family_select.trigger('change')

      } else if (!_.isUndefined(field_class) && field_class === 'font-options__wrapper') {

        // if the value is a simple string it must be the font family
        if (_.isString(value)) {
          let option = field.parent().find('option[value="' + value + '"]')

          option.attr('selected', 'selected')
          // option.parents('select').trigger('change');
        } else if (_.isObject(value)) {
          // Find the options list wrapper
          let optionsList = field.parent().children('.font-options__options-list')

          if (optionsList.length) {
            // We will process each font property and update it
            _.each(value, function (val, key) {
              // We need to map the keys to the data attributes we are using - I know :(
              let mappedKey = key
              switch (key) {
                case 'font-family':
                  mappedKey = 'font_family'
                  break
                case 'font-size':
                  mappedKey = 'font_size'
                  break
                case 'font-weight':
                  mappedKey = 'selected_variants'
                  break
                case 'letter-spacing':
                  mappedKey = 'letter_spacing'
                  break
                case 'text-transform':
                  mappedKey = 'text_transform'
                  break
                default:
                  break
              }
              let subField = optionsList.find('[data-field="' + mappedKey + '"]')
              if (subField.length) {
                subField.val(val)
                subField.trigger('change')
              }
            })
          }
        }

      } else {
        setting.set(value)
      }
    }

    const update_siblings_selects = function (font_select) {
      const $font_select = $(font_select)
      let selectedFont = $font_select.val(),
        $input = $font_select.siblings('.customify_typography_values'),
        currentValue = $input.attr('value')

      if (currentValue === '[object Object]') {
        currentValue = $input.data('default')
      } else if (_.isString(currentValue) && !isJsonString(currentValue)) {
        // a rare case when the value isn't a json but is a representative string like [family,weight]
        currentValue = currentValue.split(',')
        let tempValue = {}
        if (!_.isUndefined(currentValue[0])) {
          tempValue['font_family'] = currentValue[0]
        }

        if (!_.isUndefined(currentValue[1])) {
          tempValue['selected_variants'] = currentValue[1]
        }

        currentValue = JSON.stringify(tempValue)
      }

      let $font_weight = $font_select.parent().siblings('ul.options').find('.customify_typography_font_weight'),
        $font_subsets = $font_select.parent().siblings('ul.options').find('.customify_typography_font_subsets')

      try {
        currentValue = JSON.parse(decodeURIComponent(currentValue))
      } catch (e) {

        // in case of an error, force the rebuild of the json
        if (_.isUndefined($font_select.data('bound_once'))) {

          $font_select.data('bound_once', true)

          $font_select.change()
          $font_weight.change()
          $font_subsets.change()
        }
      }

      // first try to get the font from sure sources, not from the recommended list.
      let selectedOptionData = $font_select.find(':not(optgroup[label=Recommended]) option[value="' + selectedFont + '"]')
      // however, if there isn't an option found, get what you can
      if (selectedOptionData.length < 1) {
        selectedOptionData = $font_select.find('option[value="' + selectedFont + '"]')
      }

      if (selectedOptionData.length > 0) {

        let selectedFontType = selectedOptionData.data('type'),
          newValue = {'type': selectedFontType, 'font_family': selectedFont},
          variants = null,
          subsets = null

        if (selectedFontType == 'std') {
          variants = {
            0: '100',
            1: '200',
            3: '300',
            4: '400',
            5: '500',
            6: '600',
            7: '700',
            8: '800',
            9: '900'
          }
          if (!_.isUndefined($(selectedOptionData[0]).data('variants'))) {
            //maybe the variants are a JSON
            variants = maybeJsonParse($(selectedOptionData[0]).data('variants'))
          }
        } else {
          //maybe the variants are a JSON
          variants = maybeJsonParse($(selectedOptionData[0]).data('variants'))

          //maybe the subsets are a JSON
          subsets = maybeJsonParse($(selectedOptionData[0]).data('subsets'))
        }

        // make the variants selector
        if (!_.isUndefined(variants) && !_.isNull(variants) && !_.isEmpty(variants)) {

          newValue['variants'] = variants
          // when a font is selected force the first weight to load
          newValue['selected_variants'] = {0: variants[0]}

          let variantsOptionsMarkup = '',
            variantsCount = 0

          if (Array.isArray(variants) || _.isObject(variants)) {
            // Take each variant and produce the option markup
            $.each(variants, function (key, el) {
              let isVariantSelected = ''
              if (_.isObject(currentValue.selected_variants) && inObject(el, currentValue.selected_variants)) {
                isVariantSelected = ' selected="selected"'
              } else if (_.isString(currentValue.selected_variants) && el === currentValue.selected_variants) {
                isVariantSelected = ' selected="selected"'
              }

              // initialize
              let variantOptionValue = el,
                variantOptionName = el

              // If we are dealing with a object variant then it means things get tricky (probably it's our fault but bear with us)
              // This probably comes from our Fonto plugin - a font with individually named variants - hence each has its own font-family
              if (_.isObject(el)) {
                //put the entire object in the variation value - we will need it when outputting the custom CSS
                variantOptionValue = encodeURIComponent(JSON.stringify(el))
                variantOptionName = ''

                //if we have weight and style then "compose" them into something standard
                if (!_.isUndefined(el['font-weight'])) {
                  variantOptionName += el['font-weight']
                }

                if (_.isString(el['font-style']) && $.inArray(el['font-style'].toLowerCase(), [
                  'normal',
                  'regular'
                ]) < 0) { //this comparison means it hasn't been found
                  variantOptionName += el['font-style']
                }
              }

              variantsOptionsMarkup += '<option value="' + variantOptionValue + '"' + isVariantSelected + '>' + variantOptionName + '</option>'
              variantsCount++
            })
          }

          if (!_.isUndefined($font_weight)) {
            $font_weight.html(variantsOptionsMarkup)
            // if there is no weight or just 1 we hide the weight select ... cuz is useless
            if ($font_select.data('load_all_weights') === true || variantsCount <= 1) {
              $font_weight.parent().css('display', 'none')
            } else {
              $font_weight.parent().css('display', 'inline-block')
            }
          }
        } else if (!_.isUndefined($font_weight)) {
          $font_weight.parent().css('display', 'none')
        }

        // make the subsets selector
        if (!_.isUndefined(subsets) && !_.isNull(subsets) && !_.isEmpty(subsets)) {

          newValue['subsets'] = subsets
          // when a font is selected force the first subset to load
          newValue['selected_subsets'] = {0: subsets[0]}
          let subsetsOptionsMarkup = '',
            subsetsCount = 0
          $.each(subsets, function (key, el) {
            let is_selected = ''
            if (_.isObject(currentValue.selected_subsets) && inObject(el, currentValue.selected_subsets)) {
              is_selected = ' selected="selected"'
            }

            subsetsOptionsMarkup += '<option value="' + el + '"' + is_selected + '>' + el + '</option>'
            subsetsCount++
          })

          if (!_.isUndefined($font_subsets)) {
            $font_subsets.html(subsetsOptionsMarkup)

            // if there is no subset or just 1 we hide the subsets select ... cuz is useless
            if (subsetsCount <= 1) {
              $font_subsets.parent().css('display', 'none')
            } else {
              $font_subsets.parent().css('display', 'inline-block')
            }
          }
        } else if (!_.isUndefined($font_subsets)) {
          $font_subsets.parent().css('display', 'none')
        }

        $input.val(encodeURIComponent(JSON.stringify(newValue)))
      }
    }

    /** Modules **/

    const customifyBackgroundJsControl = (
      function () {
        'use strict'

        function init () {
          // Remove the image button
          $('.customize-control-custom_background .remove-image, .customize-control-custom_background .remove-file').unbind('click').on('click', function (e) {
            removeImage($(this).parents('.customize-control-custom_background:first'))
            preview($(this))
            return false
          })

          // Upload media button
          $('.customize-control-custom_background .background_upload_button').unbind().on('click', function (event) {
            addImage(event, $(this).parents('.customize-control-custom_background:first'))
          })

          $('.customify_background_select').on('change', function () {
            preview($(this))
          })
        }

        // Add a file via the wp.media function
        function addImage (event, selector) {
          // Stop this from propagating.
          event.preventDefault()

          let frame
          const $thisElement = $(this)

          // If the media frame already exists, reopen it.
          if (frame) {
            frame.open()
            return
          }

          // Create the media frame.
          frame = wp.media({
            multiple: false,
            library: {
              //type: 'image' //Only allow images
            },
            // Set the title of the modal.
            title: $thisElement.data('choose'),

            // Customize the submit button.
            button: {
              // Set the text of the button.
              text: $thisElement.data('update')
              // Tell the button not to close the modal, since we're
              // going to refresh the page when the image is selected.
            }
          })

          // When an image is selected, run a callback.
          frame.on('select', function () {
            // Grab the selected attachment.
            const attachment = frame.state().get('selection').first()
            frame.close()

            if (attachment.attributes.type !== 'image') {
              return
            }

            selector.find('.upload').attr('value', attachment.attributes.url)
            selector.find('.upload-id').attr('value', attachment.attributes.id)
            selector.find('.upload-height').attr('value', attachment.attributes.height)
            selector.find('.upload-width').attr('value', attachment.attributes.width)

            let thumbSrc = attachment.attributes.url
            if (!_.isUndefined(attachment.attributes.sizes) && !_.isUndefined(attachment.attributes.sizes.thumbnail)) {
              thumbSrc = attachment.attributes.sizes.thumbnail.url
            } else if (!_.isUndefined(attachment.attributes.sizes)) {
              let height = attachment.attributes.height
              for (let key in attachment.attributes.sizes) {
                const object = attachment.attributes.sizes[key]
                if (object.height < height) {
                  height = object.height
                  thumbSrc = object.url
                }
              }
            } else {
              thumbSrc = attachment.attributes.icon
            }

            selector.find('.customify_background_input.background-image').val(attachment.attributes.url)

            if (!selector.find('.upload').hasClass('noPreview')) {
              selector.find('.preview_screenshot').empty().hide().append('<img class="preview_image" src="' + thumbSrc + '">').slideDown('fast')
            }
            //selector.find('.media_upload_button').unbind();
            selector.find('.remove-image').removeClass('hide')//show "Remove" button
            selector.find('.customify_background_select').removeClass('hide')//show "Remove" button

            preview(selector)
          })

          // Finally, open the modal.
          frame.open()
        }

        // Update the background preview
        function preview (selector) {

          let $parent = selector.parents('.customize-control-custom_background:first')

          if (selector.hasClass('customize-control-custom_background')) {
            $parent = selector
          }

          if ($parent.length > 0) {
            $parent = $($parent[0])
          } else {
            return
          }

          const image_holder = $parent.find('.background-preview')

          if (!image_holder) { // No preview present
            return
          }

          const settingID = $parent.find('.button.background_upload_button').data('setting_id'),
            setting = api.instance(settingID)

          let background_data = {}

          $parent.find('.customify_background_select, .customify_background_input').each(function () {
            let data = $(this).serializeArray()

            data = data[0]
            if (data && data.name.indexOf('[background-') != -1) {

              background_data[$(this).data('select_name')] = data.value
            }
          })

          setting.set(background_data)
          //// Notify the customizer api about this change
          api.trigger('change')
          api.previewer.refresh()
        }

        // Update the background preview
        function removeImage (parent) {
          const selector = parent.find('.upload_button_div')
          // This shouldn't have been run...
          if (!selector.find('.remove-image').addClass('hide')) {
            return
          }

          selector.find('.remove-image').addClass('hide')//hide "Remove" button
          parent.find('.customify_background_select').addClass('hide')

          selector.find('.upload').val('')
          selector.find('.upload-id').val('')
          selector.find('.upload-height').val('')
          selector.find('.upload-width').val('')
          parent.find('.customify_background_input.background-image').val('')

          let settingID = selector.find('.background_upload_button').data('setting_id'),
            control = api.control(settingID + '_control'),
            currentValues = control.setting(),
            screenshot = parent.find('.preview_screenshot'),
            to_array = $.map(currentValues, function (value, index) {
              return [value]
            })

          // Hide the screenshot
          screenshot.slideUp()
          selector.find('.remove-file').unbind()
          to_array['background-image'] = ''
          control.setting(to_array)
        }

        return {
          init: init
        }
      }
    )(jQuery)

    /** HELPERS **/

    /**
     * Function to check if a value exists in an object
     * @param value
     * @param obj
     * @returns {boolean}
     */
    const inObject = function (value, obj) {
      for (let k in obj) {
        if (!obj.hasOwnProperty(k)) {
          continue
        }
        if (_.isEqual(obj[k], value)) {
          return true
        }
      }
      return false
    }

    const maybeJsonParse = function (value) {
      let parsed

      //try and parse it, with decodeURIComponent
      try {
        parsed = JSON.parse(decodeURIComponent(value))
      } catch (e) {

        // in case of an error, treat is as a string
        parsed = value
      }

      return parsed
    }

    const getUrlVars = function (name) {
      let vars = [], hash
      const hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&')
      for (let i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=')

        vars.push(hash[0])
        vars[hash[0]] = hash[1]
      }

      if (!_.isUndefined(vars[name])) {
        return vars[name]
      }
      return false
    }

    const isJsonString = function (str) {
      try {
        JSON.parse(str)
      } catch (e) {
        return false
      }
      return true
    }
  }
)(jQuery, window, wp)
