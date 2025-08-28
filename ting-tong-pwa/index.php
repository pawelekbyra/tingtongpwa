<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1, minimum-scale=1">

    <!-- The rest of the meta tags are in the main HTML file, but wp_head() is essential for plugins and theme functionality. -->
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    <?php
    // Load the main app structure from a static HTML file to keep it portable.
    $template_path = get_template_directory() . '/app-template.html';
    if ( file_exists( $template_path ) ) {
        // Use echo to output the content.
        echo file_get_contents( $template_path );
    } else {
        // Fallback message if the template is missing.
        echo '<p style="color:white; text-align:center; padding: 20px;">Error: App template file not found.</p>';
    }
    ?>

    <?php wp_footer(); ?>
</body>
</html>
