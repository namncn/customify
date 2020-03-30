// This is for the Customizer Font control
let CustomifyFontSelectFields = (function ($, exports, wp) {
  const
    wrapperSelector = '.font-options__wrapper',
    valueHolderSelector = '.customify_font_values',
    fontFamilySelector = '.customify_font_family',
    fontWeightSelector = '.customify_font_weight',
    fontSubsetsSelector = '.customify_font_subsets',
    selectPlaceholder = 'Select a font family',
    weightPlaceholder = 'Select a font weight',
    subsetPlaceholder = 'Extra Subsets'

  const api = wp.customize

  // We will use this to remember that we are self-updating the field from the subfields.
  // We will save this info for each setting ID.
  const updatingValue = {},
    loadingValue = {}

  function init () {
    let $fontFamilyFields = $(fontFamilySelector)

    // Add the Google Fonts opts to each control.
    if (typeof api.settings['google_fonts_opts'] !== 'undefined') {
      $fontFamilyFields.each(function (i, el) {
        let google_opts_placeholder = $(el).find('.google-fonts-opts-placeholder').first()
        if (google_opts_placeholder) {
          // Replace the placeholder with the HTML for the Google fonts select options.
          google_opts_placeholder.replaceWith(api.settings['google_fonts_opts'])

          // The active font family might be a Google font so we need to set the current value after we've added the options.
          let active_font_family = $(el).data('active_font_family')
          if (typeof active_font_family !== 'undefined') {
            $(el).val(active_font_family)
          }
        }
      })
    }

    $fontFamilyFields.select2({
      placeholder: selectPlaceholder
    }).on('change', function (e) {
      let new_option = $(e.target).find('option:selected'),
        wrapper = $(e.target).closest(wrapperSelector)

      // Update the weight subfield with the new options given by the selected font family.
      updateWeightField(new_option, wrapper)

      // Update the subset subfield with the new options given by the selected font family.
      updateSubsetField(new_option, wrapper)

      // Serialize subfield values and refresh the fonts in the preview window.
      selfUpdateValue(wrapper)
    })

    // Initialize the select2 field for the font family
    $fontFamilyFields.on('change', function (e) {
      let new_option = $(e.target).find('option:selected'),
        wrapper = $(e.target).closest(wrapperSelector)

      // Update the weight subfield with the new options given by the selected font family.
      updateWeightField(new_option, wrapper)

      // Update the subset subfield with the new options given by the selected font family.
      updateSubsetField(new_option, wrapper)

      // Serialize subfield values and refresh the fonts in the preview window.
      selfUpdateValue(wrapper)
    })

    // Initialize the select2 field for the font weight
    $(fontWeightSelector).each(function (i, el) {

      let select2_args = {
        theme: 'classic',
        placeholder: weightPlaceholder,
        minimumResultsForSearch: 10,
      }

      // all this fuss is for the case when the font doesn't come with variants from PHP, like a theme_font
      if (this.options.length === 0) {
        let wrapper = $(el).closest(wrapperSelector),
          font = wrapper.find(fontFamilySelector),
          option = font[0].options[font[0].selectedIndex],
          variants = maybeJsonParse($(option).data('variants')),
          data = [],
          selected_variants = $(el).data('default') || null

        if (typeof variants === 'undefined') {
          $(this).hide()
          return
        }

        $.each(variants, function (index, weight) {
          let thisValue = {
            id: weight,
            text: weight
          }

          // @todo We actually do not support multiple selected variants. Maybe we should? Right now we don't use multiple selections.
          if (selected_variants !== null && weight == selected_variants) {
            thisValue.selected = true
          }

          data.push(thisValue)
        })

        if (data !== []) {
          select2_args.data = data
        }
      }

      $(this).select2(
        select2_args
      ).on('change', function (e) {
        let wrapper = $(e.target).closest(wrapperSelector)

        // Serialize subfield values and refresh the fonts in the preview window.
        selfUpdateValue(wrapper)
      })
    })

    // Initialize the select2 field for the font subsets
    $(fontSubsetsSelector)
      .select2({
        placeholder: subsetPlaceholder,
        theme: 'classic',
        minimumResultsForSearch: 10,
      })
      .on('change', function (e) {
        let wrapper = $(e.target).closest(wrapperSelector)

        // Serialize subfield values and refresh the fonts in the preview window.
        selfUpdateValue(wrapper)
      })

    let rangers = $fontFamilyFields.parents(wrapperSelector).find('input[type=range]'),
      selects = $fontFamilyFields.parents(wrapperSelector).find('select').not('select[class*=\' select2\'],select[class^=\'select2\']')

    // Initialize the all the regular selects in the font controls
    if (selects.length > 0) {
      selects.on('change', function (e) {
        let wrapper = $(e.target).closest(wrapperSelector)

        // Serialize subfield values and refresh the fonts in the preview window.
        selfUpdateValue(wrapper)
      })
    }

    // Initialize the all the range fields in the font controls
    if (rangers.length > 0) {
      rangers.on('change', function (e) {
        let wrapper = $(e.target).closest(wrapperSelector)

        // Serialize subfield values and refresh the fonts in the preview window.
        selfUpdateValue(wrapper)

        api.previewer.send('font-changed')
      })
    }

    // When the previewer window is ready, render the fonts
    const self = this
    api.previewer.bind('ready', function () {
      self.renderFonts()
    })

    // Handle the reverse value direction, when the customize setting is updated and the subfields need to update their values.
    $fontFamilyFields.each(function (i, el) {
      let wrapper = $(el).closest(wrapperSelector),
        value_holder = wrapper.children(valueHolderSelector),
        setting_id = $(value_holder).data('customize-setting-link'),
        setting = api(setting_id)

      setting.bind(function (newValue, oldValue) {
        if (!updatingValue[this.id]) {
          value_holder.val(newValue)

          loadFontValue(wrapper)
        }
      })
    })
  }

  /**
   * This function updates the data in font weight selector from the given <option> element
   *
   * @param option
   * @param wrapper
   */
  function updateWeightField (option, wrapper) {
    let variants = maybeJsonParse($(option).data('variants')),
      font_weights = wrapper.find(fontWeightSelector),
      selectedVariant = font_weights.val() ? font_weights.val() : font_weights.data('default'),
      newVariants = [],
      id = wrapper.find(valueHolderSelector).data('customizeSettingLink')

    if (customify_settings.settings[id].load_all_weights || typeof variants === 'undefined' || Object.keys(variants).length < 2 || !_.isUndefined(font_weights.data('disabled'))) {
      font_weights.parent().hide()
      return
    }

    font_weights.parent().show()

    // we need to turn the data array into a specific form like [{id:"id", text:"Text"}]
    $.each(variants, function (index, variant) {
      let newVariant = {
        'id': variant,
        'text': variant
      }

      // Leave the comparison loose.
      if (selectedVariant == variant) {
        newVariant.selected = true
      }

      newVariants.push(newVariant)
    })

    // We need to clear the old select2 field and reinitialize it.
    $(font_weights).select2().empty()
    $(font_weights).select2({
      theme: 'classic',
      data: newVariants,
      minimumResultsForSearch: 10,
    }).on('change', function (e) {
      let wrapper = $(e.target).closest(wrapperSelector)

      // Serialize subfield values and refresh the fonts in the preview window.
      selfUpdateValue(wrapper)
    })
  }

  /**
   *  This function updates the data in font subset selector from the given <option> element
   * @param option
   * @param wrapper
   */
  function updateSubsetField (option, wrapper) {
    let subsets = maybeJsonParse($(option).data('subsets')),
      font_subsets = wrapper.find(fontSubsetsSelector),
      newSubsets = [],
      type = $(option).data('type')

    if (type !== 'google' || typeof subsets === 'undefined' || Object.keys(subsets).length < 2 || !_.isUndefined(font_subsets.data('disabled'))) {
      font_subsets.parent().hide()
      return
    }

    font_subsets.parent().show()

    // Attempt to keep (some of) the previously selected subsets, depending on what the new font supports.
    let currentFontValue = maybeJsonParse(wrapper.children(valueHolderSelector).val())
    let selectedSubsets = []
    if (!_.isUndefined(currentFontValue.selected_subsets) && !_.isEmpty(currentFontValue.selected_subsets)) {
      selectedSubsets = currentFontValue.selected_subsets
      // Make sure it is an array
      if (!Array.isArray(selectedSubsets)) {
        selectedSubsets = Object.keys(selectedSubsets).map(function (key) {
          return selectedSubsets[key]
        })
      }
    }

    // we need to turn the data array into a specific form like [{id:"id", text:"Text"}]
    $.each(subsets, function (index, subset) {
      // We want to skip the 'latin' subset since that is loaded by default.
      if ('latin' === subset) {
        return
      }

      let newSubset = {
        'id': subset,
        'text': subset
      }

      if (selectedSubsets.indexOf(subset) !== -1) {
        newSubset.selected = true
      }

      newSubsets.push(newSubset)
    })

    // We need to clear the old select2 field and reinitialize it.
    $(font_subsets).select2().empty()
    $(font_subsets).select2({
      data: newSubsets
    }).on('change', function (e) {
      let wrapper = $(e.target).closest(wrapperSelector)

      // Serialize subfield values and refresh the fonts in the preview window.
      selfUpdateValue(wrapper)
    })
  }

  function getValue (wrapper) {
    let value_holder = wrapper.children(valueHolderSelector)

    if (value_holder.length) {
      return maybeJsonParse(value_holder.val())
    }

    return []
  }

  function updateValue (wrapper, value) {
    let value_holder = wrapper.children(valueHolderSelector),
      setting_id = $(value_holder).data('customize-setting-link'),
      setting = api(setting_id)

    if (!value_holder.length) {
      return
    }

    if (_.isArrayLikeObject(value)) {
      value = encodeValues(value)
    }

    // Set the serialized value in the hidden field.
    value_holder.val(value)
    // Update also the Customizer setting value.
    setting.set(value)
  }

  /**
   * This function is a custom value serializer for our entire font field
   * It collects values and saves them (encoded) into the `.customify_font_values` input's value
   */
  function selfUpdateValue (wrapper) {
    let options_list = $(wrapper).find('.font-options__options-list'),
      inputs = options_list.find('[data-field]'),
      value_holder = wrapper.children(valueHolderSelector),
      setting_id = $(value_holder).data('customize-setting-link'),
      setting = api(setting_id),
      newFontData = {}

    // If we are already self-updating this and we haven't finished, we need to stop here to prevent infinite loops
    // This call might have come from a subfield detecting the change the triggering a further update_font_value()
    if (true === updatingValue[setting_id]) {
      return
    }

    // If we are loading this setting value and haven't finished, there is no point in updating it as this would cause infinite loops.
    if (true === loadingValue[setting_id]) {
      return
    }

    // Mark the fact that we are self-updating the field value
    updatingValue[setting_id] = true

    inputs.each(function (key, el) {
      let field = $(el).data('field'),
        value = $(el).val()

      if ('font_family' === field) {
        // the font family also holds the type
        let selected_opt = $(el.options[el.selectedIndex]),
          type = selected_opt.data('type'),
          subsets = selected_opt.data('subsets'),
          variants = selected_opt.data('variants')

        if (!_.isUndefined(type)) {
          newFontData['type'] = type
          if (type === 'theme_font') {
            newFontData['src'] = selected_opt.data('src')
          }
        }

        if (!_.isUndefined(variants)) {
          newFontData['variants'] = maybeJsonParse(variants)
        }

        if (!_.isUndefined(subsets)) {
          newFontData['subsets'] = maybeJsonParse(subsets)
        }
      }

      if (!_.isUndefined(field) && !_.isUndefined(value) && !_.isNull(value) && value !== '') {
        newFontData[field] = value
      }
    })

    // Serialize the newly gathered font data
    let serializedNewFontData = encodeValues(newFontData)
    // Set the serialized value in the hidden field.
    value_holder.val(serializedNewFontData)
    // Update also the Customizer setting value.
    setting.set(serializedNewFontData)

    // Finished with the field value self-updating.
    updatingValue[setting_id] = false

    return newFontData
  }

  /**
   * This function is a reverse of update_font_value(), initializing the entire font field controls based on the value stored in the hidden input.
   */
  function loadFontValue (wrapper) {
    let options_list = $(wrapper).find('.font-options__options-list'),
      inputs = options_list.find('[data-field]'),
      value_holder = wrapper.children(valueHolderSelector),
      value = maybeJsonParse(value_holder.val()),
      setting_id = $(value_holder).data('customize-setting-link')

    // If we are already loading this setting value and haven't finished, there is no point in starting again.
    if (true === loadingValue[setting_id]) {
      return
    }

    // Mark the fact that we are loading the field value
    loadingValue[setting_id] = true

    inputs.each(function (key, el) {
      let field = $(el).data('field')

      // In the case of select2, only the original selects have the data field, thus excluding select2 created select DOM elements
      if (typeof field !== 'undefined' && field !== '' && typeof value[field] !== 'undefined') {
        // If the value contains also the unit (it is not a number) we need to split it and change the subfield accordingly.
        let cleanValue = value[field],
          unit = ''
        // We will do this only for numerical fields.
        if (_.contains(['letter_spacing', 'line_height', 'font_size'], field) && isNaN(cleanValue)) {
          // If we have a standardized value field (as array), use that.
          if (typeof cleanValue.value !== 'undefined') {
            if (typeof cleanValue.unit !== 'undefined') {
              unit = cleanValue.unit
            }

            cleanValue = cleanValue.value
          } else {
            // Treat the case when the value is a string.
            let matches = cleanValue.match(/^([\d.\-+]+)(.+)/i)
            if (matches !== null && typeof matches[1] !== 'undefined') {
              cleanValue = matches[1]
              unit = matches[2]
            }
          }
        }

        if (unit !== '') {
          $(el).attr('unit', unit)
        }

        // If this field has a min/max attribute we need to make sure that those attributes allow for the value we are trying to impose.
        // But only for numerical values.
        if (!isNaN(cleanValue)) {
          if ($(el).attr('min') && $(el).attr('min') > cleanValue) {
            $(el).attr('min', cleanValue)
          }
          if ($(el).attr('max') && $(el).attr('max') < cleanValue) {
            $(el).attr('max', cleanValue)
          }
        }

        $(el).val(cleanValue).trigger('change')
      }
    })

    // Finished with the field value loading.
    loadingValue[setting_id] = false
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

  const encodeValues = function (obj) {
    return encodeURIComponent(JSON.stringify(obj))
  }

  const renderFonts = function () {
    $('.customify_font_family').select2({
      theme: 'classic',
      minimumResultsForSearch: 10,
    }).trigger('change')
  }

  return {
    renderFonts: renderFonts,
    init: init,
    getValue: getValue,
    updateValue: updateValue,
    selfUpdateValue: selfUpdateValue,
    encodeValues: encodeValues,
  }
})(jQuery, window, wp)
