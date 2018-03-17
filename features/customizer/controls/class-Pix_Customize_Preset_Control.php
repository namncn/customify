<?php

/**
 * Class Pix_Customize_Preset_Control
 * A simple Select2 Control
 */
class Pix_Customize_Preset_Control extends Pix_Customize_Control {
	public $type    = 'preset';
	public $choices_type    = 'select';
	public $description    = null;

	/**
	 * Render the control's content.
	 *
	 * @since 3.4.0
	 */
	public function render_content() {

		switch ( $this->choices_type ) {

			case 'select' : { ?>
			<label>
				<?php if ( ! empty( $this->label ) ) { ?>
					<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
				<?php }
				if ( ! empty( $this->description ) ) { ?>
					<span class="description customize-control-description"><?php echo $this->description; ?></span>
				<?php } ?>

				<select <?php $this->link(); ?> class="customify_preset select">
					<?php
					foreach ( $this->choices as $choice_value => $choice_config ){
						if ( ! isset( $choice_config['options']) || ! isset( $choice_config['label'] ) ) {
							continue;
						}
						$label = $choice_config['label'];
						$options = $this->convertChoiceOptionsIdsToSettingIds( $choice_config['options'] );
						$data = ' data-options=\'' . json_encode($options) . '\'';
						echo '<option value="' . esc_attr( $choice_value ) . '" ' . selected( $this->value(), $choice_value, false ) . $data . ' >' . $label . '</option>';
					} ?>
				</select>
			</label>
			<?php break;
			}

			case 'radio' : { ?>
				<label>
					<?php if ( ! empty( $this->label ) ) { ?>
						<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
					<?php }
					if ( ! empty( $this->description ) ) { ?>
						<span class="description customize-control-description"><?php echo $this->description; ?></span>
					<?php } ?>

					<div class="customify_preset radio customize-control customize-control-radio">
						<?php
						foreach ( $this->choices as $choice_value => $choice_config ){
							if ( ! isset( $choice_config['options']) || ! isset( $choice_config['label'] ) ) {
								continue;
							}
							$color = '';
							if ( isset( $choice_config['color'] ) ) {
								$color .= ' style="background-color: ' . $choice_config['color'] . '"';
							}

							$label = $choice_config['label'];
							$options = $this->convertChoiceOptionsIdsToSettingIds( $choice_config['options'] );
							$data = ' data-options=\'' . json_encode( $options ) . '\''; ?>

							<span class="customize-inside-control-row">
								<input <?php $this->link(); echo 'name="' . $this->setting->id . '" id="' . $choice_value . '" type="radio" value="' . esc_attr( $choice_value ) . '" ' . selected( $this->value(), $choice_value, false ) . $data . $color .' />'; ?>
								<label for="<?php echo $choice_value; ?>">
									<?php echo $label; ?>
								</label>
							</span>
						<?php } ?>
					</div>
				</label>
			<?php break;
			}

			case 'buttons' : { ?>
				<label>
					<?php if ( ! empty( $this->label ) ) { ?>
						<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
					<?php }
					if ( ! empty( $this->description ) ) { ?>
						<span class="description customize-control-description"><?php echo $this->description; ?></span>
					<?php } ?>

					<div class="customify_preset radio_buttons">
						<?php
						foreach ( $this->choices as $choice_value => $choice_config ){
							if ( ! isset( $choice_config['options']) || ! isset( $choice_config['label'] ) ) {
								continue;
							}
							$color = '';
							if ( isset( $choice_config['color'] ) ) {
								$color .= ' style="border-left-color: ' . $choice_config['color'] . '; color: ' . $choice_config['color'] . ';"';
							}

							$label = $choice_config['label'];
							$options = $this->convertChoiceOptionsIdsToSettingIds( $choice_config['options'] );
							$data = ' data-options=\'' . json_encode($options) . '\'';?>

							<fieldset class="customify_radio_button">
								<input <?php $this->link(); echo 'name="' .  $this->setting->id . '" type="radio" value="' . esc_attr( $choice_value ) . '" ' . selected( $this->value(), $choice_value, false ) . $data .' />'; ?>
								<label class="button" for="<?php echo $this->setting->id; ?>" <?php echo $color; ?>>
									<?php echo $label; ?>
								</label>
							</fieldset>
						<?php } ?>
					</div>
				</label>
				<?php break;
			}

			case 'awesome' : { ?>
				<label>
					<?php if ( ! empty( $this->label ) ) { ?>
						<span class="customize-control-title"><?php echo esc_html( $this->label ); ?></span>
					<?php } ?>

					<div class="customify_preset awesome_presets">
						<?php

						$google_links = array();

						foreach ( $this->choices as $choice_value => $choice_config ){
							if ( ! isset( $choice_config['options']) || ! isset( $choice_config['label'] ) ) {
								continue;
							}

							$preset_style = ' style="background-color: #444;';
							$preset_name_style = ' style=" color: #000; background-color: #ccc; border-color: #aaa;';
							$preset_text_color = ' style=" color: #ebebeb';

							$first_font = $second_font = '';
							if ( isset( $choice_config['preview'] ) ) {

								if ( isset( $choice_config['preview']['background-card'] ) ) {
									$preset_style = ' style="';
									$preset_style .= 'background-color: ' .  $choice_config['preview']['background-card'] . ';';
								}

								if ( isset( $choice_config['preview']['background-label'] ) ) {

									$this_preset_color = $choice_config['preview']['background-label'];

									if ( $this->isLight( $this_preset_color ) ) {
										$this_preset_color = '#000000';
									} else {
										$this_preset_color = '#ffffff';
									}
									$preset_name_style = ' style="';
									$preset_name_style .= 'color: ' .$this_preset_color . ';background-color: ' .  $choice_config['preview']['background-label'] . '; border-color: ' .  $choice_config['preview']['background-label'];
								}

								if ( isset( $choice_config['preview']['color-text'] ) ) {
									$preset_text_color = ' style="';
									$preset_text_color .= 'color: ' .  $choice_config['preview']['color-text'] . ';"';
								}

								if ( isset( $choice_config['preview']['font-main'] ) ) {
									$first_font = ' style="font-family: ' . $choice_config['preview']['font-main'] . '"' ;
									$google_links[] = str_replace( ' ', '+', $choice_config['preview']['font-main'] );
								}

								if ( isset( $choice_config['preview']['font-alt'] ) ) {
									$second_font = ' style="font-family: ' . $choice_config['preview']['font-alt'] . '"' ;
									$google_links[] = str_replace( ' ', '+', $choice_config['preview']['font-alt'] );
								}
							}

							$preset_style .= '"';
							$preset_text_color .= '"';
							$preset_name_style .= '"';

							$label = $choice_config['label'];
							$options = $this->convertChoiceOptionsIdsToSettingIds( $choice_config['options'] );
							$data = ' data-options=\'' . json_encode($options) . '\'';?>
							<div class="awesome_preset" <?php echo $preset_text_color; ?>>
								<input <?php $this->link(); echo 'name="' .  $this->setting->id . '" type="radio" value="' . esc_attr( $choice_value ) . '" ' . selected( $this->value(), $choice_value, false ) . $data .' >'  . '</input>'; ?>
								<div class="preset-wrap">
                                    <div class="preset-color" <?php echo $preset_style; ?>>
                                        <span class="first-font" <?php echo $first_font; ?>><?php echo substr( get_bloginfo('name'), 0, 2); ?></span>
                                        <span class="secondary-font" <?php echo $second_font; ?>>AaBbCc</span>
                                    </div>
                                    <div class="preset-name" <?php echo $preset_name_style; ?>>
                                        <?php echo $label; ?>
                                    </div>
                                </div>
							</div>
						<?php }

						// ok now we have our preview fonts, let's ask them from google
						// note that we request only these chars "AaBbCc" so it should be a small request
						echo '<link href="//fonts.googleapis.com/css?family=' . implode('|', $google_links ) . '&text=AaBbCc' . substr( get_bloginfo('name'), 0, 2) . '" rel=\'stylesheet\' type=\'text/css\'>';?>
					</div>

					<?php
					if ( ! empty( $this->description ) ) { ?>
						<span class="description customize-control-description"><?php echo $this->description; ?></span>
					<?php } ?>
				</label>
				<?php break;
			}

			default:
				break;
		}
	}

	/**
	 * Returns whether or not given color is considered "light"
	 * @param string|Boolean $color
	 * @return boolean
	 */
	public function isLight( $color = FALSE ){
		// Get our color
		$color = ($color) ? $color : $this->_hex;
		// Calculate straight from rbg
		$r = hexdec($color[0].$color[1]);
		$g = hexdec($color[2].$color[3]);
		$b = hexdec($color[4].$color[5]);
		return (( $r*299 + $g*587 + $b*114 )/1000 > 130);
	}

	/**
	 * We will receive the choice options IDs as defined in the Customify config (the options array keys) and we will convert them to actual setting IDs.
	 *
	 * @param array $options
	 *
	 * @return array
	 */
	protected function convertChoiceOptionsIdsToSettingIds( $options ) {
		$settings = array();

		if ( empty( $options ) ) {
			return $settings;
		}

		$localPlugin = PixCustomifyPlugin();
		$customizer_config = $localPlugin->get_customizer_config();

		// first check the very needed options name
		if ( empty( $customizer_config['opt-name'] ) ) {
			return $settings;
		}
		$options_name = $customizer_config['opt-name'];

		// Coerce a single string into an array and treat it as a field ID.
		if ( is_string( $options ) ) {
			$options = array( $options );
		}

		foreach ( $options as $option_id => $option_value ) {
			$option_config = $localPlugin->get_option_customizer_config( $option_id );
			if ( empty( $option_config ) ) {
				continue;
			}

			// If we have been explicitly given a setting ID we will use that
			if ( ! empty( $option_config['setting_id'] ) ) {
				$setting_id = $option_config['setting_id'];
			} else {
				$setting_id = $options_name . '[' . $option_id . ']';
			}

			$settings[ $setting_id ] = $option_value;
		}

		return $settings;
	}
}
