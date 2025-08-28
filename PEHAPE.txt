
/**
 * Plik functions.php dla motywu Ting Tong.
 *
 * Zawiera całą logikę backendową dla aplikacji opartej na WordPressie.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Zabezpieczenie przed bezpośrednim dostępem.
}

// =========================================================================
// 1. SYSTEM POLUBIEŃ (Tabela + Funkcje pomocnicze)
// =========================================================================

/**
 * Tworzy tabelę do przechowywania polubień.
 */
function tt_likes_create_table() {
	global $wpdb;

	$table_name      = $wpdb->prefix . 'tt_likes';
	$charset_collate = $wpdb->get_charset_collate();

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$sql = "CREATE TABLE {$table_name} (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
		item_id BIGINT UNSIGNED NOT NULL,
		user_id BIGINT UNSIGNED NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		UNIQUE KEY uniq_user_item (user_id, item_id),
		KEY idx_item (item_id)
	) {$charset_collate};";

	dbDelta( $sql );
	update_option( 'tt_likes_db_version', '1.0' );
}
add_action( 'after_switch_theme', 'tt_likes_create_table' );

/** Fallback: upewnij się, że tabela istnieje. */
add_action( 'init', function () {
	if ( get_option( 'tt_likes_db_version' ) !== '1.0' ) {
		tt_likes_create_table();
	}
} );

/**
 * Pobiera liczbę polubień dla elementu.
 */
function tt_likes_get_count( $item_id ) {
	global $wpdb;

	return (int) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->prefix}tt_likes WHERE item_id = %d",
			$item_id
		)
	);
}

/**
 * Sprawdza, czy użytkownik polubił element.
 */
function tt_likes_user_has( $item_id, $user_id ) {
	if ( ! $user_id ) {
		return false;
	}

	global $wpdb;

	return (bool) $wpdb->get_var(
		$wpdb->prepare(
			"SELECT COUNT(*) FROM {$wpdb->prefix}tt_likes WHERE item_id = %d AND user_id = %d",
			$item_id,
			$user_id
		)
	);
}

// =========================================================================
// 2. PRZYGOTOWANIE I PRZEKAZANIE DANYCH DO JAVASCRIPT
// =========================================================================

/**
 * Pobiera dane slajdów, które zostaną przekazane do frontendu.
 */
function tt_get_slides_data() {
	$user_id = get_current_user_id(); // 0 jeśli gość

	// Symulujemy pobieranie postów z bazy danych
	$simulated_posts = [
		[
			'post_id'      => 1,
			'post_title'   => 'Paweł Polutek',
			'post_content' => 'To jest dynamicznie załadowany opis dla pierwszego slajdu. Działa!',
			'video_url'    => 'https://pawelperfect.pl/wp-content/uploads/2025/07/17169505-hd_1080_1920_30fps.mp4',
			'access'       => 'public',
			'comments'     => 567,
			'avatar'       => 'https://i.pravatar.cc/100?u=pawel',
		],
		[
			'post_id'      => 2,
			'post_title'   => 'Web Dev',
			'post_content' => 'Kolejny slajd, kolejne wideo. #efficiency',
			'video_url'    => 'https://pawelperfect.pl/wp-content/uploads/2025/07/4434150-hd_1080_1920_30fps-1.mp4',
			'access'       => 'public',
			'comments'     => 1245,
			'avatar'       => 'https://i.pravatar.cc/100?u=webdev',
		],
		[
			'post_id'      => 3,
			'post_title'   => 'Tajemniczy Tester',
			'post_content' => 'Ten slajd jest tajny! 🤫',
			'video_url'    => 'https://pawelperfect.pl/wp-content/uploads/2025/07/4678261-hd_1080_1920_25fps.mp4',
			'access'       => 'secret',
			'comments'     => 2,
			'avatar'       => 'https://i.pravatar.cc/100?u=tester',
		],
		[
			'post_id'      => 4,
			'post_title'   => 'Artysta AI',
			'post_content' => 'Generowane przez AI, renderowane przez przeglądarkę. #future',
			'video_url'    => 'https://pawelperfect.pl/wp-content/uploads/2025/07/AdobeStock_631182722-online-video-cutter.com_.mp4',
			'access'       => 'public',
			'comments'     => 890,
			'avatar'       => 'https://i.pravatar.cc/100?u=ai-artist',
		],
	];

	$slides_data = [];

	foreach ( $simulated_posts as $post ) {
		$slides_data[] = [
			'id'              => 'slide-' . str_pad( $post['post_id'], 3, '0', STR_PAD_LEFT ),
			'likeId'          => (string) $post['post_id'],
			'user'            => $post['post_title'],
			'description'     => $post['post_content'],
			'mp4Url'          => $post['video_url'],
			'hlsUrl'          => null,
			'poster'          => '',
			'avatar'          => $post['avatar'],
			'access'          => $post['access'],
			'initialLikes'    => tt_likes_get_count( $post['post_id'] ),
			'isLiked'         => tt_likes_user_has( $post['post_id'], $user_id ),
			'initialComments' => $post['comments'],
		];
	}

	return $slides_data;
}

/**
 * Dodaje skrypty i lokalizuje dane dla frontendu.
 */
function tt_enqueue_and_localize_scripts() {
	wp_register_script( 'tt-main-app', false, [], null, true );
	wp_enqueue_script( 'tt-main-app' );

	wp_localize_script(
		'tt-main-app',
		'TingTongData',
		[
			'isLoggedIn' => is_user_logged_in(),
			'slides'     => tt_get_slides_data(),
		]
	);

	wp_localize_script(
		'tt-main-app',
		'ajax_object',
		[
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'nonce'    => wp_create_nonce( 'tt_ajax_nonce' ),
		]
	);
}
add_action( 'wp_enqueue_scripts', 'tt_enqueue_and_localize_scripts' );

// =========================================================================
// 3. HANDLERY AJAX (Logowanie, Wylogowanie, Lajkowanie i Nonce)
// =========================================================================

/**
 * Handler AJAX do pobierania zaktualizowanych danych slajdów.
 * Wywoływany przez JS po zalogowaniu, aby zsynchronizować stan polubień.
 */
function tt_get_slides_data_ajax_handler() {
	check_ajax_referer( 'tt_ajax_nonce', 'nonce' );

	// Używamy istniejącej funkcji, która już poprawnie pobiera dane dla zalogowanego użytkownika
	wp_send_json_success( tt_get_slides_data() );
}
// Dostępne tylko dla zalogowanych użytkowników (wp_ajax_...)
add_action( 'wp_ajax_tt_get_slides_data_ajax', 'tt_get_slides_data_ajax_handler' );

/** Handler AJAX do przełączania polubienia. */
add_action( 'wp_ajax_toggle_like', function () {
	check_ajax_referer( 'tt_ajax_nonce', 'nonce' );

	if ( ! is_user_logged_in() ) {
		wp_send_json_error( [ 'message' => 'Musisz się zalogować, aby polubić.' ], 401 );
	}

	$item_id = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;

	if ( ! $item_id ) {
		wp_send_json_error( [ 'message' => 'Brak ID elementu.' ], 400 );
	}

	$user_id    = get_current_user_id();
	global $wpdb;
	$table_name = $wpdb->prefix . 'tt_likes';

	if ( tt_likes_user_has( $item_id, $user_id ) ) {
		$wpdb->delete(
			$table_name,
			[
				'item_id' => $item_id,
				'user_id' => $user_id,
			]
		);
		$status = 'unliked';
	} else {
		$wpdb->insert(
			$table_name,
			[
				'item_id' => $item_id,
				'user_id' => $user_id,
			]
		);
		$status = 'liked';
	}

	wp_send_json_success(
		[
			'status' => $status,
			'count'  => tt_likes_get_count( $item_id ),
		]
	);
} );

/** Handler AJAX do logowania. */
add_action( 'wp_ajax_nopriv_tt_ajax_login', function () {
	check_ajax_referer( 'tt_ajax_nonce', 'nonce' );

	$credentials = [
		'user_login'    => isset( $_POST['log'] ) ? sanitize_user( $_POST['log'] ) : '',
		'user_password' => isset( $_POST['pwd'] ) ? $_POST['pwd'] : '',
		'remember'      => true,
	];

	$user = wp_signon( $credentials, is_ssl() );

	if ( is_wp_error( $user ) ) {
		wp_send_json_error( [ 'message' => 'Błędne dane logowania.' ] );
	} else {
		wp_set_current_user( $user->ID );
		wp_set_auth_cookie( $user->ID, true, is_ssl() );
		wp_send_json_success( [ 'message' => 'Zalogowano pomyślnie.' ] );
	}
} );

/** Handler AJAX do wylogowania bez przeładowania strony. */
add_action( 'wp_ajax_tt_ajax_logout', function () {
	check_ajax_referer( 'tt_ajax_nonce', 'nonce' );
	wp_logout();
	wp_send_json_success( [ 'message' => 'Wylogowano pomyślnie.' ] );
} );

/**
 * Handler AJAX do odświeżania nonca po zmianie stanu logowania.
 * Zwraca bezpośredni, prosty JSON, aby uniknąć niejasności.
 */
function tt_refresh_nonce_handler() {
	header( 'Content-Type: application/json; charset=utf-8' );

	echo json_encode(
		[
			'success' => true,
			'nonce'   => wp_create_nonce( 'tt_ajax_nonce' ),
		]
	);

	wp_die();
}
add_action( 'wp_ajax_tt_refresh_nonce', 'tt_refresh_nonce_handler' );
add_action( 'wp_ajax_nopriv_tt_refresh_nonce', 'tt_refresh_nonce_handler' );

// =========================================================================
// 4. NIESTANDARDOWE SHORTCODE'Y I FORMULARZE
// =========================================================================

/**
 * Shortcode [tt_login_form] generujący formularz dla AJAX.
 */
function tt_login_form_shortcode() {
	if ( is_user_logged_in() ) {
		return '<p style="padding: 20px; text-align: center;">Jesteś już zalogowany.</p>';
	}

	// Formularz z action="#" aby JS mógł przejąć submit.
	return '
	<form name="loginform" class="login-form" action="#" method="post">
		<p class="login-username">
			<label for="user_login">Nazwa użytkownika lub e-mail</label>
			<input type="text" name="log" id="user_login" class="input" value="" size="20" required autocomplete="username">
		</p>
		<p class="login-password">
			<label for="user_pass">Hasło</label>
			<input type="password" name="pwd" id="user_pass" class="input" value="" size="20" required autocomplete="current-password">
		</p>
		<p class="login-submit">
			<input type="submit" name="wp-submit" id="wp-submit" class="button button-primary" value="Zaloguj się">
		</p>
	</form>';
}
add_shortcode( 'tt_login_form', 'tt_login_form_shortcode' );


/* ========================================================================
 * JEDYNA ZMIANA — TT Konto (AJAX) — BEZ logowania/wylogowania/polubień
 * Ten blok to wyczyszczona wersja sandboxa służąca wyłącznie do obsługi formularza "Konto".
 * Źródło: phpsandbox.txt (obsługa profilu/hasła/avatara/konta) :contentReference[oaicite:0]{index=0}
 * Pozostawiamy bez zmian: funkszynorginal.txt (logowanie, wylogowanie, lajki, nonce) :contentReference[oaicite:1]{index=1}
 * ======================================================================== */

/* ========================================================================
 * TT Profile: READ-ONLY (AJAX)
 * Zwraca: first_name, last_name, email, display_name, username, avatar, user_id
 * ======================================================================== */
add_action('wp_ajax_tt_profile_get', function () {
    check_ajax_referer('tt_ajax_nonce', 'nonce');

    if ( ! is_user_logged_in() ) {
        wp_send_json_error(['message' => 'not_logged_in'], 401);
    }

    $u = wp_get_current_user();
    $data = [
        'user_id'      => (int) $u->ID,
        'username'     => $u->user_login,
        'email'        => $u->user_email,
        'display_name' => $u->display_name,
        'first_name'   => (string) get_user_meta($u->ID, 'first_name', true),
        'last_name'    => (string) get_user_meta($u->ID, 'last_name',  true),
        'avatar'       => get_avatar_url($u->ID, ['size' => 96]),
    ];

    // Uwaga: zwracamy bez dodatkowego "data"
    wp_send_json_success($data);
});

// Niezalogowany: spójna odpowiedź z błędem
add_action('wp_ajax_nopriv_tt_profile_get', function () {
    wp_send_json_error(['message' => 'not_logged_in'], 401);
});


/* ========================================================================
 * TT Profile UPDATE (AJAX)
 * Wymaga: nonce 'tt_ajax_nonce', użytkownik zalogowany.
 * Zapisuje: first_name, last_name, email (WSZYSTKIE pola wymagane).
 * Walidacja: format e-mail, brak kolizji z innym kontem.
 * ======================================================================== */
add_action('wp_ajax_tt_profile_update', function () {
    check_ajax_referer('tt_ajax_nonce', 'nonce');

    if ( ! is_user_logged_in() ) {
        wp_send_json_error(['message' => 'not_logged_in'], 401);
    }

    $u     = wp_get_current_user();
    $first = isset($_POST['first_name']) ? sanitize_text_field( wp_unslash($_POST['first_name']) ) : '';
    $last  = isset($_POST['last_name'])  ? sanitize_text_field( wp_unslash($_POST['last_name']) )  : '';
    $email = isset($_POST['email'])      ? sanitize_email(       wp_unslash($_POST['email']) )      : '';

    if ($first === '' || $last === '' || $email === '') {
        wp_send_json_error(['message' => 'Wszystkie pola są wymagane.'], 400);
    }
    if ( ! is_email($email) ) {
        wp_send_json_error(['message' => 'Nieprawidłowy adres e-mail.'], 400);
    }

    $exists = email_exists($email);
    if ($exists && (int) $exists !== (int) $u->ID) {
        wp_send_json_error(['message' => 'Ten e-mail jest już zajęty.'], 409);
    }

    update_user_meta($u->ID, 'first_name', $first);
    update_user_meta($u->ID, 'last_name',  $last);

    $display_name = trim($first . ' ' . $last);
    $userdata = [
        'ID'         => $u->ID,
        'user_email' => $email,
    ];
    if ($display_name !== '') {
        $userdata['display_name'] = $display_name;
    }

    $res = wp_update_user($userdata);
    if (is_wp_error($res)) {
        wp_send_json_error(['message' => $res->get_error_message() ?: 'Błąd aktualizacji użytkownika.'], 500);
    }

    wp_send_json_success([
        'user_id'      => (int) $u->ID,
        'username'     => $u->user_login,
        'email'        => $email,
        'display_name' => $display_name ?: $u->display_name,
        'first_name'   => $first,
        'last_name'    => $last,
        'avatar'       => get_avatar_url($u->ID, ['size' => 96]),
    ]);
});


/* ========================================================================
 * TT Avatar UPLOAD (AJAX; dataURL PNG/JPEG 512x512)
 * Przyjmuje: POST 'image' = data URL (np. "data:image/png;base64,...")
 * Działanie: zapis do Media Library, meta usera 'tt_avatar_id' i 'tt_avatar_url'
 * ======================================================================== */
add_action('wp_ajax_tt_avatar_upload', function () {
    check_ajax_referer('tt_ajax_nonce', 'nonce');

    if ( ! is_user_logged_in() ) {
        wp_send_json_error(['message' => 'not_logged_in'], 401);
    }

    $dataUrl = isset($_POST['image']) ? trim( wp_unslash($_POST['image']) ) : '';
    if ($dataUrl === '' || strpos($dataUrl, 'data:image') !== 0) {
        wp_send_json_error(['message' => 'Brak lub błędny obraz.'], 400);
    }

    if ( ! preg_match('#^data:(image/[^;]+);base64,(.+)$#', $dataUrl, $m) ) {
        wp_send_json_error(['message' => 'Nieprawidłowy format obrazu.'], 400);
    }
    $mime   = strtolower($m[1]);
    $base64 = $m[2];
    $bin    = base64_decode($base64);
    if ( ! $bin ) {
        wp_send_json_error(['message' => 'Nie można zdekodować obrazu.'], 400);
    }
    if (strlen($bin) > 2 * 1024 * 1024) {
        wp_send_json_error(['message' => 'Plik jest zbyt duży (max 2 MB).'], 413);
    }

    if ( ! function_exists('wp_handle_sideload') ) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
    }

    $u   = wp_get_current_user();
    $ext = ($mime === 'image/png') ? 'png' : ( ($mime === 'image/jpeg' || $mime === 'image/jpg') ? 'jpg' : 'png' );
    $filename = 'tt-avatar-' . (int) $u->ID . '-' . time() . '.' . $ext;

    $tmp = wp_tempnam($filename);
    file_put_contents($tmp, $bin);

    $file_array = [
        'name'     => $filename,
        'type'     => $mime,
        'tmp_name' => $tmp,
        'error'    => 0,
        'size'     => filesize($tmp),
    ];
    $file = wp_handle_sideload($file_array, ['test_form' => false]);

    if ( isset($file['error']) ) {
        @unlink($tmp);
        wp_send_json_error(['message' => 'Upload nieudany: ' . $file['error']], 500);
    }

    $attachment = [
        'post_mime_type' => $mime,
        'post_title'     => sanitize_file_name( pathinfo($filename, PATHINFO_FILENAME) ),
        'post_content'   => '',
        'post_status'    => 'inherit',
    ];
    $attach_id = wp_insert_attachment($attachment, $file['file']);
    if (is_wp_error($attach_id)) {
        wp_send_json_error(['message' => 'Nie można utworzyć załącznika.'], 500);
    }

    $metadata = wp_generate_attachment_metadata($attach_id, $file['file']);
    wp_update_attachment_metadata($attach_id, $metadata);

    update_user_meta($u->ID, 'tt_avatar_id',  $attach_id);
    $url = wp_get_attachment_url($attach_id);
    update_user_meta($u->ID, 'tt_avatar_url', esc_url_raw($url));

    wp_send_json_success(['url' => $url, 'attachment_id' => $attach_id]);
});


/* ========================================================================
 * (Opcjonalnie) Preferuj nasz avatar w całym WP, jeśli istnieje
 * Dzięki temu get_avatar_url($user_id) zwróci nasz upload, jeśli jest ustawiony.
 * ======================================================================== */
add_filter('get_avatar_url', function ($url, $id_or_email, $args) {
    $user_id = 0;

    if (is_numeric($id_or_email)) {
        $user_id = (int) $id_or_email;
    } elseif (is_object($id_or_email) && isset($id_or_email->user_id)) {
        $user_id = (int) $id_or_email->user_id;
    } elseif (is_string($id_or_email)) {
        $user = get_user_by('email', $id_or_email);
        if ($user) {
            $user_id = (int) $user->ID;
        }
    }

    if ($user_id > 0) {
        $custom = get_user_meta($user_id, 'tt_avatar_url', true);
        if ($custom) {
            return esc_url($custom);
        }
    }
    return $url;
}, 10, 3);


/* ========================================================================
 * TT Password CHANGE (AJAX)
 * current_password + new_password_1 + new_password_2 (min 8 znaków; równe)
 * Zmiana hasła unieważnia bieżącą sesję.
 * ======================================================================== */
add_action('wp_ajax_tt_password_change', function () {
    check_ajax_referer('tt_ajax_nonce', 'nonce');

    if (!is_user_logged_in()) {
        wp_send_json_error(['message'=>'not_logged_in'], 401);
    }

    $u = wp_get_current_user();
    $cur = isset($_POST['current_password']) ? (string) wp_unslash($_POST['current_password']) : '';
    $n1  = isset($_POST['new_password_1'])   ? (string) wp_unslash($_POST['new_password_1'])   : '';
    $n2  = isset($_POST['new_password_2'])   ? (string) wp_unslash($_POST['new_password_2'])   : '';

    if ($cur === '' || $n1 === '' || $n2 === '') {
        wp_send_json_error(['message' => 'Wszystkie pola są wymagane.'], 400);
    }
    if ($n1 !== $n2) {
        wp_send_json_error(['message' => 'Nowe hasła muszą być identyczne.'], 400);
    }
    if (strlen($n1) < 8) {
        wp_send_json_error(['message' => 'Nowe hasło musi mieć min. 8 znaków.'], 400);
    }

    require_once ABSPATH . 'wp-includes/pluggable.php';
    if (!wp_check_password($cur, $u->user_pass, $u->ID)) {
        wp_send_json_error(['message' => 'Aktualne hasło jest nieprawidłowe.'], 403);
    }

    wp_set_password($n1, $u->ID); // unieważnia sesję
    wp_send_json_success(['message' => 'Hasło zmienione. Zaloguj się ponownie.']);
});


/* ========================================================================
 * TT Account DELETE (AJAX)
 * Potwierdzenie: dokładnie "USUWAM KONTO". Nie usuwa kont administratorów.
 * ======================================================================== */
add_action('wp_ajax_tt_account_delete', function () {
    check_ajax_referer('tt_ajax_nonce', 'nonce');

    if (!is_user_logged_in()) {
        wp_send_json_error(['message'=>'not_logged_in'], 401);
    }

    $u = wp_get_current_user();
    $confirm = isset($_POST['confirm_text']) ? trim((string) wp_unslash($_POST['confirm_text'])) : '';

    if ($confirm !== 'USUWAM KONTO') {
        wp_send_json_error(['message' => 'Aby potwierdzić, wpisz dokładnie: USUWAM KONTO'], 400);
    }

    if (user_can($u, 'administrator')) {
        wp_send_json_error(['message' => 'Konto administratora nie może być usunięte tą metodą.'], 403);
    }

    require_once ABSPATH . 'wp-admin/includes/user.php';
    $deleted = wp_delete_user($u->ID);
    if (!$deleted) {
        wp_send_json_error(['message' => 'Nie udało się usunąć konta.'], 500);
    }

    wp_logout();
    wp_send_json_success(['message' => 'Konto usunięte.']);
});

/* Koniec bloku — reszta pliku nietknięta. */

/**
 * TingTong Notifications REST (per-user unread dot)
 * Routes:
 *  GET  /wp-json/tingtong/v1/notifications/unread   -> { success, unread_count }
 *  POST /wp-json/tingtong/v1/notifications/read-all -> { success }
 *
 * Uwaga: to jest lekki licznik "kropki" per user. W przyszłości możesz
 * podmienić na realną tabelę z rekordami powiadomień.
 */

add_action('rest_api_init', function () {
    register_rest_route('tingtong/v1', '/notifications/unread', [
        'methods'  => 'GET',
        'callback' => 'ttn_rest_get_unread',
        'permission_callback' => function () { return is_user_logged_in(); },
    ]);

    register_rest_route('tingtong/v1', '/notifications/read-all', [
        'methods'  => 'POST',
        'callback' => 'ttn_rest_post_read_all',
        'permission_callback' => function () { return is_user_logged_in(); },
    ]);
});

/** GET: zwróć ilość nieprzeczytanych (kropka) */
function ttn_rest_get_unread(WP_REST_Request $req) {
    $user_id = get_current_user_id();
    $count = (int) get_user_meta($user_id, '_tt_unread_count', true);
    return new WP_REST_Response([ 'success' => true, 'unread_count' => $count ], 200);
}

/** POST: wyzeruj ilość nieprzeczytanych po otwarciu modala */
function ttn_rest_post_read_all(WP_REST_Request $req) {
    $user_id = get_current_user_id();
    update_user_meta($user_id, '_tt_unread_count', 0);
    return new WP_REST_Response([ 'success' => true ], 200);
}

/**
 * (Opcjonalnie) — helper do podbijania licznika kropki po stronie serwera,
 * gdy generujesz nowe powiadomienie dla usera:
 *
 *   ttn_inc_unread_count($user_id);
 */
function ttn_inc_unread_count($user_id, $by = 1){
    $current = (int) get_user_meta($user_id, '_tt_unread_count', true);
    update_user_meta($user_id, '_tt_unread_count', max(0, $current + (int)$by));
}

/**
 * (Opcjonalnie) wstrzyknij nonce + root do JS (jeśli nie masz jeszcze wpApiSettings):
 *  add_action('wp_enqueue_scripts', function(){
 *      wp_localize_script('twoj-glowny-scenariusz', 'ttApi', [
 *          'root'  => esc_url_raw( rest_url() ),
 *          'nonce' => wp_create_nonce('wp_rest')
 *      ]);
 *  });
 */
