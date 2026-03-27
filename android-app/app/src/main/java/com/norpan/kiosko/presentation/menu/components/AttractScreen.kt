package com.norpan.kiosko.presentation.menu.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import coil.compose.rememberAsyncImagePainter
import coil.request.ImageRequest
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.ui.theme.KioskColors
import kotlinx.coroutines.delay

/**
 * Pantalla de descanso (Attract Screen) estilo McDonald's/Burger King.
 * Muestra imágenes promocionales en slideshow o un video, con un CTA parpadeante.
 */
@Composable
fun AttractScreen(
    onTouchToStart: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val images = KioskConfig.attractScreenImageUrls
    val attractText = KioskConfig.attractScreenText
    val slideshowInterval = KioskConfig.attractScreenSlideshowInterval

    // Índice actual de imagen en slideshow
    var currentImageIndex by remember { mutableIntStateOf(0) }

    // Cambiar imagen cada X segundos
    LaunchedEffect(images) {
        if (images.size > 1) {
            while (true) {
                delay(slideshowInterval.toLong())
                currentImageIndex = (currentImageIndex + 1) % images.size
            }
        }
    }

    // Animación de pulso para el ícono
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.7f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                onTouchToStart()
            }
    ) {
        // Fondo: imagen de slideshow o color sólido
        if (images.isNotEmpty()) {
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(animationSpec = tween(500)),
                exit = fadeOut(animationSpec = tween(500))
            ) {
                Image(
                    painter = rememberAsyncImagePainter(
                        ImageRequest.Builder(context)
                            .data(images.getOrNull(currentImageIndex))
                            .crossfade(500)
                            .build()
                    ),
                    contentDescription = "Imagen promocional",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            }
        } else {
            // Fondo con gradiente si no hay imágenes
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                KioskConfig.primaryColor,
                                KioskConfig.secondaryColor
                            )
                        )
                    )
            )
        }

        // Overlay oscuro para mejor legibilidad
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(KioskColors.attractOverlay)
        )

        // Contenido centrado
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo o nombre del negocio
            Text(
                text = KioskConfig.businessName,
                style = MaterialTheme.typography.displayLarge,
                color = KioskConfig.primaryColor,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(80.dp))

            // Ícono de "tocar" con animación de pulso
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(pulseScale)
                    .alpha(pulseAlpha)
                    .background(
                        color = KioskConfig.primaryColor.copy(alpha = 0.2f),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.TouchApp,
                    contentDescription = "Tocar para comenzar",
                    modifier = Modifier.size(64.dp),
                    tint = KioskConfig.primaryColor
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Texto de CTA
            Text(
                text = attractText,
                style = MaterialTheme.typography.displaySmall,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.alpha(pulseAlpha)
            )
        }

        // Indicadores de slideshow (puntos)
        if (images.size > 1) {
            androidx.compose.foundation.layout.Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 32.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                images.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .size(if (index == currentImageIndex) 12.dp else 8.dp)
                            .background(
                                color = if (index == currentImageIndex)
                                    KioskConfig.primaryColor
                                else
                                    Color.White.copy(alpha = 0.5f),
                                shape = CircleShape
                            )
                    )
                }
            }
        }
    }
}
