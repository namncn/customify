let ColorPalettes = ( function( $, exports, wp ) {

	const defaultVariation = 'light';
	const masterSettingIds = [
        "sm_color_primary",
        "sm_color_secondary",
        "sm_color_tertiary",
        "sm_dark_primary",
        "sm_dark_secondary",
        "sm_dark_tertiary",
        "sm_light_primary",
        "sm_light_secondary",
        "sm_light_tertiary"
    ];

	const master_color_selector = '#_customize-input-sm_dark_color_master_slider_control';
	const primary_color_selector = '#_customize-input-sm_dark_color_primary_slider_control';
	const secondary_color_selector = '#_customize-input-sm_dark_color_secondary_slider_control';
	const tertiary_color_selector = '#_customize-input-sm_dark_color_tertiary_slider_control';
	const color_dispersion_selector = '#_customize-input-sm_colors_dispersion_control';
	const color_focus_point_selector = '#_customize-input-sm_colors_focus_point_control';
	const color_sliders_selector = primary_color_selector + ', ' + secondary_color_selector + ', ' + tertiary_color_selector;
	const all_sliders_selector = color_sliders_selector + ', ' + color_dispersion_selector + ', ' + color_focus_point_selector;


    const initializePalettes = () => {
        // Cache initial settings configuration to be able to update connected fields on variation change.
        if ( typeof window.settingsClone === "undefined" ) {
            window.settingsClone = $.extend(true, {}, wp.customize.settings.settings);
        }

        // Create a stack of callbacks bound to parent settings to be able to unbind them
        // when altering the connected_fields attribute.
        if ( typeof window.connectedFieldsCallbacks === "undefined" ) {
            window.connectedFieldsCallbacks = {};
        }
    };

	const hexDigits = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];

	function rgb2hex(rgb) {
		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
	}

	function hex(x) {
		return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
	}

    const updateCurrentPalette = ( label ) => {
        const $palette = $( '.c-color-palette' );

        if ( ! $palette.length ) {
            return;
        }

        const $current = $palette.find( '.colors.current' );
        const $next = $palette.find( '.colors.next' );

        label = label || 'Custom Style';
        $palette.find( '.c-color-palette__name' ).text( label );

        // apply the last animate set of colors to the "current" color palette
        _.each( masterSettingIds, function( setting_id ) {
            const color = $next.find( '.' + setting_id ).css( 'color' );
            $current.find( '.color.' + setting_id ).css( 'color', color );
            $palette.find( 'input.' + setting_id ).val( rgb2hex( color ) );
        });

        // removing the "animate" class will put the "next" color palette out view
        // so we can update the colors in it
        $palette.removeClass( 'animate' );

        // update the colors in the "next" palette with the new values
        _.each( masterSettingIds, function( setting_id ) {
            const setting = wp.customize( setting_id );

            if ( typeof setting !== "undefined" ) {
                $next.find( '.' + setting_id ).css( 'color', setting() );
            }
        });

        // trigger transition to new color palette
        setTimeout(function() {
            $palette.addClass( 'animate' );
            $palette.find( '.c-color-palette__control' ).css( 'color', wp.customize( 'sm_color_primary' )() );
        });
    };

    const resetSettings = settings => {
        _.each( settings, function( setting_id ) {
            const setting = wp.customize( setting_id );

            if ( typeof setting !== "undefined" ) {
                let value = setting();
                setting.set( value + "ff" );
                setting.set( value );
            }
        });
    };

    const getConnectedFieldsCallback = function( parent_setting_data, parent_setting_id ) {
        return function( new_value, old_value ) {
            _.each( parent_setting_data.connected_fields, function( connected_field_data ) {
                if ( _.isUndefined( connected_field_data ) || _.isUndefined( connected_field_data.setting_id ) || ! _.isString( connected_field_data.setting_id ) ) {
                    return;
                }
                const setting = wp.customize( connected_field_data.setting_id );
                if ( _.isUndefined( setting ) ) {
                    return;
                }
                setting.set( new_value );
            } );
        }
    };

    const bindConnectedFields = function() {
        _.each( masterSettingIds, function( parent_setting_id ) {
            if ( typeof wp.customize.settings.settings[parent_setting_id] !== "undefined" ) {
                let parent_setting_data = wp.customize.settings.settings[parent_setting_id];
                let parent_setting = wp.customize(parent_setting_id);

                if (typeof parent_setting_data.connected_fields !== "undefined") {
                    connectedFieldsCallbacks[parent_setting_id] = getConnectedFieldsCallback(parent_setting_data, parent_setting_id);
                    parent_setting.bind(connectedFieldsCallbacks[parent_setting_id]);
                }
            }
        } );
    };

    const unbindConnectedFields = function() {
        _.each( masterSettingIds, function( parent_setting_id ) {
            if ( typeof wp.customize.settings.settings[parent_setting_id] !== "undefined" ) {
                let parent_setting_data = wp.customize.settings.settings[parent_setting_id];
                let parent_setting = wp.customize(parent_setting_id);

                if (typeof parent_setting_data.connected_fields !== "undefined" && typeof connectedFieldsCallbacks[parent_setting_id] !== "undefined") {
                    parent_setting.unbind(connectedFieldsCallbacks[parent_setting_id]);
                }
                delete connectedFieldsCallbacks[parent_setting_id];
            }
        } );
    };

    // alter connected fields of the master colors controls depending on the selected palette variation
    const getCurrentVariation = () => {
	    const setting = wp.customize( 'sm_color_palette_variation' );

	    if ( _.isUndefined( setting ) ) {
		    return defaultVariation;
	    }

	    const variation = setting();

	    if ( ! window.colorPalettesVariations.hasOwnProperty( variation ) ) {
	    	return defaultVariation;
	    }

	    return variation;
    };

    const createCurrentPaletteControls = () => {
        const $palette = $( '.c-color-palette' );
        const $fields = $palette.find( '.c-color-palette__fields' ).find( 'input' );

        if ( ! $palette.length ) {
            return;
        }

        const $colors = $palette.find( '.colors.next .color' );

        $colors.each( ( i, obj ) => {
            const $obj = $( obj );
            const setting_id = $obj.data( 'setting' );
            const $input = $fields.filter( '.' + setting_id );
            const setting = wp.customize( setting_id );

            $obj.data( 'target', $input );

            $input.iris( {
                change: ( event, ui ) => {
                    const lastColor = setting();
                    const currentColor = ui.color.toString();

                    if ( 'sm_color_primary' === $obj.data( 'setting' ) ) {
	                    $( '.c-color-palette__control' ).css( 'color', currentColor );
                    }

                    if ( lastColor !== currentColor ) {
                        $obj.css( 'color', currentColor );
	                    setting.set( currentColor );
                        $palette.find( '.c-color-palette__name' ).text( 'Custom Style' );
                    }
                }
            } );

	        $obj.find( '.iris-picker' ).on( 'click', function( e ) {
		        e.stopPropagation();
		        e.preventDefault();
            } );

	        $obj.on( 'click', ( e ) => {
                e.stopPropagation();
                e.preventDefault();

                if ( $input.is( ':visible' ) ) {
                    $input.iris( 'hide' );
                    $input.hide();
                    $colors.removeClass( 'active inactive' );
                } else {
                    $colors.not( $obj ).each( function( i, obj ) {
                        $( obj ).data( 'target' ).not( $input ).hide();
                    } );
                    $input.show().focus();
                }
            } );

	        $input.on( 'click', ( e ) => {
		        e.stopPropagation();
		        e.preventDefault();
	        } );

	        $input.on( 'focus', ( e ) => {

		        $colors.each( ( i, obj ) => {
		            $( obj ).data( 'target' ).not( $input ).iris( 'hide' );
		        } );

		        $colors.not( $obj ).addClass( 'inactive' ).removeClass( 'active' );
		        $obj.addClass( 'active' ).removeClass( 'inactive' );

                $colors.not( $obj ).each( function( i, obj ) {
                    $( obj ).data( 'target' ).iris( 'hide' );
                } );

                const $iris = $input.next( '.iris-picker' );
                const paletteWidth = $palette.outerWidth();
                const $visibleColors = $colors.filter( ':visible' );
                const index = $visibleColors.index( $obj );

                $iris.css( 'left', ( paletteWidth - 200 ) * index / ( $visibleColors.length - 1 ) );

                $input.iris( 'color', $obj.css( 'color' ) );
                $input.iris( 'show' );
            } );
        } );

        $( 'body' ).on( 'click', function() {
            $colors.removeClass( 'active inactive' );
	        $colors.each( function( i, obj ) {
	            const $input = $( obj ).data( 'target' );

		        $input.iris( 'hide' );
		        $input.hide();
	        } );
        } );
    };

    const onPaletteChange = function() {
        const $label = $( this ).next( 'label' ).clone();
        let label;

        $label.find( '.preview__letter' ).remove();
        label = $label.text();
        $label.remove();

        $( this ).trigger( 'customify:preset-change' );
        updateCurrentPalette( label );
	    buildColorMatrix();
    };

    const buildColorMatrix = () => {
        const $matrix = $( '.sm_color_matrix' );

        $matrix.empty();

	    _.each( masterSettingIds, function( setting_id ) {
	        const $bucket = $( '<div class="' + setting_id + '">' ).appendTo( $matrix );
            const color = wp.customize( setting_id )();
		    _.each( wp.customize.settings.settings[setting_id]['connected_fields'], function( connected_field ) {
		        const $color = $( '<div title="' + connected_field.setting_id + '">' ).appendTo( $bucket );
		        $color.css( 'color', color );
            } );
	    });
    };

    const toggleVisibleOptions = ( settings ) => {
        let optionsToShow = [];

        _.each( masterSettingIds, function( settingId ) {
        	const connectedFields = settings[settingId]['connected_fields'];
        	if ( ! _.isUndefined( connectedFields ) && connectedFields.length ) {
        		optionsToShow.push( settingId );
	        }
        } );

        if ( optionsToShow.length ) {
            let optionsSelector = '.' + optionsToShow.join(', .');
            $( '.c-color-palette .color' ).addClass( 'hidden' ).filter( optionsSelector ).removeClass( 'hidden' );
        }
    };

	const alterFields = (settings, swapMap) => {

        var newSettings = JSON.parse(JSON.stringify(settings));
        var oldSettings = JSON.parse(JSON.stringify(settings));

		_.each( swapMap, function( fromArray, to ) {
			if ( typeof newSettings[to] !== "undefined" ) {
				let newConnectedFields = [];
				if ( fromArray instanceof Array ) {
					_.each( fromArray, function( from ) {
						let oldConnectedFields;
						if ( _.isUndefined( oldSettings[from]['connected_fields'] ) ) {
							oldSettings[from]['connected_fields'] = [];
						}
						oldConnectedFields = Object.values( oldSettings[from]['connected_fields'] );
						newConnectedFields = newConnectedFields.concat( oldConnectedFields );
					} );
				}
				newSettings[to]['connected_fields'] = Object.keys( newConnectedFields ).map( function(key) {
					return newConnectedFields[key];
				});
			}
		} );
		return _.clone(newSettings);
	};

    const moveConnectedFields = ( settings, from, to, ratio ) => {

	    if ( ! _.isUndefined( settings[to] ) &&
	         ! _.isUndefined( settings[from] ) &&
	         ! _.isUndefined( settings[to]['connected_fields'] ) &&
	         ! _.isUndefined( settings[from]['connected_fields'] ) ) {

		    const oldFromConnectedFields = Object.values( settings[from]['connected_fields'] );
		    const oldToConnectedFields = Object.values( settings[to]['connected_fields'] );
		    const oldConnectedFields = oldToConnectedFields.concat( oldFromConnectedFields );
		    const count = ratio * oldConnectedFields.length;

		    let newToConnectedFields = oldConnectedFields.slice( 0, count );
		    let newFromConnectedFields = oldConnectedFields.slice( count );

		    newToConnectedFields = Object.keys( newToConnectedFields ).map( function(key) {
			    return newToConnectedFields[key];
		    });
		    newToConnectedFields = Object.keys( newToConnectedFields ).map( function(key) {
			    return newToConnectedFields[key];
		    });

		    settings[to]['connected_fields'] = newToConnectedFields;
		    settings[from]['connected_fields'] = newFromConnectedFields;
	    }

	    return settings;
	};

    const disperseColorConnectedFields = ( settings, dispersion, focus ) => {

    	if ( _.isUndefined( settings['sm_color_primary']['connected_fields'] ) ) {
		    settings['sm_color_primary']['connected_fields'] = [];
	    }

    	if ( _.isUndefined( settings['sm_color_secondary']['connected_fields'] ) ) {
		    settings['sm_color_secondary']['connected_fields'] = [];
	    }

    	if ( _.isUndefined( settings['sm_color_tertiary']['connected_fields'] ) ) {
		    settings['sm_color_tertiary']['connected_fields'] = [];
	    }

	    const primaryConnectedFields = Object.values( settings['sm_color_primary']['connected_fields'] );
	    const secondaryConnectedFields = Object.values( settings['sm_color_secondary']['connected_fields'] );
	    const tertiaryConnectedFields = Object.values( settings['sm_color_tertiary']['connected_fields'] );

	    //  A1              A2              A3             A4
	    //  |--- primary ---|-- secondary --|-- tertiary --|
	    //          B1                B2
	    //          |----- focus -----|

	    const b1 = focus * ( 1 - dispersion );
	    const b2 = focus + ( 1 - focus ) * dispersion;
	    const a1 = 0;
	    const a2 = 0.334;
	    const a3 = 0.667;
	    const a4 = 1;

	    const primaryWidth = b1 > a2 || b2 < a1 ? 0 : Math.min(a2, b2) - Math.max(a1, b1);
	    const secondaryWidth = b1 > a3 || b2 < a2 ? 0 : Math.min(a3, b2) - Math.max(a2, b1);
	    const tertiaryWidth = b1 > a4 || b2 < a3 ? 0 : Math.min(a4, b2) - Math.max(a3, b1);

	    const totalWidth = primaryWidth + secondaryWidth + tertiaryWidth;
	    const connectedFields = primaryConnectedFields.concat( secondaryConnectedFields ).concat( tertiaryConnectedFields );
	    const primaryFieldsCount = Math.round(connectedFields.length * primaryWidth / totalWidth);
	    const secondaryFieldsCount = Math.round(connectedFields.length * secondaryWidth / totalWidth);

	    let newPrimaryConnectedFields = connectedFields.slice(0, primaryFieldsCount);
	    let newSecondaryConnectedFields = connectedFields.slice(primaryFieldsCount, primaryFieldsCount + secondaryFieldsCount);
	    let newTertiaryConnectedFields = connectedFields.slice(primaryFieldsCount + secondaryFieldsCount);

	    newPrimaryConnectedFields = Object.keys( newPrimaryConnectedFields ).map( function(key) {
		    return newPrimaryConnectedFields[key];
	    });
	    newSecondaryConnectedFields = Object.keys( newSecondaryConnectedFields ).map( function(key) {
		    return newSecondaryConnectedFields[key];
	    });
	    newTertiaryConnectedFields = Object.keys( newTertiaryConnectedFields ).map( function(key) {
		    return newTertiaryConnectedFields[key];
	    });

	    settings['sm_color_primary']['connected_fields'] = newPrimaryConnectedFields;
	    settings['sm_color_secondary']['connected_fields'] = newSecondaryConnectedFields;
	    settings['sm_color_tertiary']['connected_fields'] = newTertiaryConnectedFields;

    	return settings;
    };

	const reloadConnectedFields = () => {
		const variation = getCurrentVariation();
		const primaryRatio = $( primary_color_selector ).val() / 100;
		const secondaryRatio = $( secondary_color_selector ).val() / 100;
		const tertiaryRatio = $( tertiary_color_selector ).val() / 100;
		const colorDispersion = $( color_dispersion_selector ).val() / 100;
		const focusPoint = $( color_focus_point_selector ).val() / 100;

		let tempSettings = _.clone(window.settingsClone);

		unbindConnectedFields();

		tempSettings = moveConnectedFields( tempSettings, 'sm_dark_primary', 'sm_color_primary', primaryRatio );
		tempSettings = moveConnectedFields( tempSettings, 'sm_dark_secondary', 'sm_color_secondary', secondaryRatio );
		tempSettings = moveConnectedFields( tempSettings, 'sm_dark_tertiary', 'sm_color_tertiary', tertiaryRatio );
		tempSettings = disperseColorConnectedFields( tempSettings, colorDispersion, focusPoint );

		tempSettings = alterFields( tempSettings, colorPalettesVariations[variation] );

		toggleVisibleOptions( tempSettings );

		wp.customize.settings.settings = tempSettings;

		bindConnectedFields();
		buildColorMatrix();
		resetSettings( masterSettingIds );
	};

    const bindEvents = () => {
	    const paletteControlSelector = '.c-color-palette__control';
	    const $paletteControl = $( paletteControlSelector );
	    const variation = getCurrentVariation();

	    $paletteControl.removeClass( 'active' );
	    $paletteControl.filter( '.variation-' + variation ).addClass( 'active' );

	    $( 'body' ).on( 'click', paletteControlSelector, function() {
		    let $obj = $( this ),
			    $target = $( $obj.data( 'target' ) );

		    $obj.siblings( paletteControlSelector ).removeClass( 'active' );
		    $obj.addClass( 'active' );
		    $target.prop( 'checked', true ).trigger( 'change' );
	    } );

	    // when variation is changed reload connected fields from cached version of customizer settings config
	    $( document ).on( 'change', '[name="_customize-radio-sm_color_palette_variation_control"]', reloadConnectedFields );

	    //
	    $( document ).on( 'click', '.customify_preset.color_palette input', onPaletteChange );

	    //
	    $( all_sliders_selector ).on( 'input', reloadConnectedFields );

	    //
	    $( master_color_selector ).on( 'input', function() {
		    const masterValue = $( master_color_selector ).val();
		    $( color_sliders_selector ).val( masterValue ).trigger( 'input' );
	    } );
    };

    wp.customize.bind( 'ready', function() {
	    initializePalettes();
	    createCurrentPaletteControls();
	    updateCurrentPalette();
	    reloadConnectedFields();
	    buildColorMatrix()
	    bindEvents();
    } );

    return {
        masterSettingIds: masterSettingIds
    };

} )( jQuery, window, wp );