use alloc::vec;

use wie_backend::canvas::{decode_image, Image, PixelType, Rgb565Pixel, VecImageBuffer};
use wie_util::{Result, WieError};

use wipi_types::wipic::{WIPICImage, WIPICIndirectPtr, WIPICWord};

use crate::{api::graphics::framebuffer::FrameBuffer, context::WIPICContext};

pub fn create_wipi_image(context: &mut dyn WIPICContext, buf: WIPICIndirectPtr, offset: WIPICWord, len: WIPICWord) -> Result<WIPICImage> {
    let img_framebuffer = decode_image_framebuffer(context, buf, offset, len)?;
    let mask_framebuffer = FrameBuffer::empty();

    Ok(WIPICImage {
        img: img_framebuffer.0,
        mask: mask_framebuffer.0,
        loop_count: 0,
        delay: 0,
        animated: 0,
        buf,
        offset,
        current: 0,
        len,
    })
}

pub fn decode_image_framebuffer(context: &mut dyn WIPICContext, buf: WIPICIndirectPtr, offset: WIPICWord, len: WIPICWord) -> Result<FrameBuffer> {
    let address = context.data_ptr(buf)?.checked_add(offset).ok_or(WieError::AllocationFailure)?;
    let mut data = vec![0; len as usize];
    context.read_bytes(address, &mut data)?;
    let image = decode_image(&data)?;
    probe_framebuffer(context, &*image, data.starts_with(b"BM"))
}

 
// Probe 5: only opaque BMPs use native screen pixels; retain alpha formats.
// This is an isolated experimental build, not a general WIPI compatibility rule.
fn probe_framebuffer(context: &mut dyn WIPICContext, image: &dyn Image, bmp: bool) -> Result<FrameBuffer> {
    if !bmp {
        return FrameBuffer::from_image(context, image);
    }
    let colors = image.colors();
    if colors.iter().any(|color| color.a != 255) {
        return FrameBuffer::from_image(context, image);
    }
    let pixels = colors.into_iter().map(Rgb565Pixel::from_color).collect();
    let converted = VecImageBuffer::<Rgb565Pixel>::from_raw(image.width(), image.height(), pixels);
    FrameBuffer::from_image(context, &converted)
}

#[cfg(test)]
mod fortune_image_tests {
    use super::*;
    use crate::context::test::TestContext;
    use wie_backend::canvas::ArgbPixel;

    #[test]
    fn bmp_odd_width_uses_packed_rgb565_and_preserves_magenta_key() {
        let mut context = TestContext::new();
        let source = VecImageBuffer::<ArgbPixel>::from_raw(3, 2, vec![
            0xffff0000, 0xff00ff00, 0xff0000ff,
            0xffff00ff, 0xffffffff, 0xff000000,
        ]);
        let fb = probe_framebuffer(&mut context, &source, true).unwrap();
        assert_eq!((fb.0.width, fb.0.height, fb.0.bpl, fb.0.bpp), (3, 2, 6, 16));
        assert_eq!(fb.data(&context).unwrap(), vec![
            0x00, 0xf8, 0xe0, 0x07, 0x1f, 0x00,
            0x1f, 0xf8, 0xff, 0xff, 0x00, 0x00,
        ]);
    }

    #[test]
    fn non_bmp_and_alpha_images_keep_original_bytes() {
        for (bmp, pixel) in [(false, 0xffff00ffu32), (true, 0x80ff00ffu32)] {
            let mut context = TestContext::new();
            let source = VecImageBuffer::<ArgbPixel>::from_raw(1, 1, vec![pixel]);
            let fb = probe_framebuffer(&mut context, &source, bmp).unwrap();
            assert_eq!((fb.0.bpl, fb.0.bpp), (4, 32));
            assert_eq!(fb.data(&context).unwrap(), pixel.to_le_bytes());
        }
    }
}
