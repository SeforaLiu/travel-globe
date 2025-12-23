# services/geocoder.py
from typing import Optional
from app.models import Location
import logging

logger = logging.getLogger(__name__)

class Geocoder:
  @staticmethod
  async def reverse_geocode(coords: dict, location_name: str) -> Optional[Location]:
    """根据坐标和位置名创建位置对象 - 不需要调用外部API"""
    try:
      lat = coords.get('lat')
      lng = coords.get('lng')

      if lat is None or lng is None:
        logger.warning(f"Invalid coordinates: {coords}")
        return None

      # 直接使用前端传来的位置名创建位置对象
      location = Location(
        name=location_name,
        coordinates={"lat": lat, "lng": lng}
      )

      logger.info(f"Created location: {location.name} for coordinates: {coords}")
      return location

    except Exception as e:
      logger.error(f"Error in reverse_geocode: {str(e)}")
      return None
