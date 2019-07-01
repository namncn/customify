<?php
/*
Plugin Name: Customify
Plugin URI:  https://wordpress.org/plugins/customify/
Description: A Theme Customizer Booster to easily customize Fonts, Colors, and other options for your site.
Version: 2.3.3
Author: Pixelgrade
Author URI: https://pixelgrade.com
Author Email: contact@pixelgrade.com
Text Domain: customify
License:     GPL-2.0+
License URI: http://www.gnu.org/licenses/gpl-2.0.txt
Domain Path: /languages/
Requires at least: 4.9.9
Tested up to: 5.2.0
*/

// If this file is called directly, abort.
if ( ! defined( 'ABSPATH' ) ) {
	die;
}

require_once 'includes/lib/class-customify-array.php';
require_once 'includes/extras.php';

/**
 * Returns the main instance of PixCustomifyPlugin to prevent the need to use globals.
 *
 * @since  1.5.0
 * @return PixCustomifyPlugin
 */
function PixCustomifyPlugin() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-pixcustomify.php';

	return PixCustomifyPlugin::instance( __FILE__, '2.3.4' );
}

// Now get the party started
// We will keep this global variable for legacy
$pixcustomify_plugin = PixCustomifyPlugin();
