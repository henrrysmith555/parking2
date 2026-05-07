  if (reservation.is_scheduled && reservation.reservation_time) {
      const now = new Date();
      const reservationTime = new Date(reservation.reservation_time);
      const minutesUntilReservation = (reservationTime.getTime() - now.getTime()) / (1000 * 60);

      // 如果预约时间在30分钟之后，不允许取消
      if (minutesUntilReservation > 30) {
        return NextResponse.json({ 
          error: `预约时间在30分钟之后，无法取消预约` 
        }, { status: 400 });
      }
    }
