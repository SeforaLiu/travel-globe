# backend/app/database.py
import logging
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text
import time

# 替换为您的实际连接 URL
DATABASE_URL = "postgresql://postgres:post123@localhost:5432/travel_db"

# 创建引擎，设置连接池和超时
engine = create_engine(
  DATABASE_URL,
  echo=True,  # 打印 SQL 语句，方便调试
  pool_size=5,  # 连接池大小
  max_overflow=10,  # 最大溢出连接数
  pool_timeout=30,  # 连接池超时时间（秒）
  pool_recycle=3600,  # 连接回收时间（秒），避免连接闲置过久
  pool_pre_ping=True,  # 预先检查连接是否可用
  echo_pool=True,  # 打印连接池日志
)

# 设置日志级别为 INFO
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_indexes():
  """
  创建性能优化的索引

  注意：现在 coordinates 字段是 JSON 类型，需要特殊处理索引
  """
  logger.info("开始创建数据库索引...")

  start_time = time.time()

  try:
    with engine.connect() as conn:
      # ===== 1. Entry 表索引 =====

      # 检查表是否存在
      table_exists = conn.exec_driver_sql(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entry')"
      ).scalar()

      if not table_exists:
        logger.warning("entry 表不存在，跳过索引创建")
        return

      # 复合索引：按用户ID和创建时间排序（用于列表查询，默认排序）
      try:
        conn.exec_driver_sql(
          """
          CREATE INDEX IF NOT EXISTS idx_entries_user_created_time 
          ON entry (user_id, created_time DESC)
          """
        )
        logger.debug("创建索引: idx_entries_user_created_time")
      except Exception as e:
        logger.warning(f"创建 idx_entries_user_created_time 索引失败: {str(e)}")

      # 复合索引：按用户ID和开始日期排序（用于列表查询，按日期排序）
      try:
        conn.exec_driver_sql(
          """
          CREATE INDEX IF NOT EXISTS idx_entries_user_date_start 
          ON entry (user_id, date_start DESC)
          """
        )
        logger.debug("创建索引: idx_entries_user_date_start")
      except Exception as e:
        logger.warning(f"创建 idx_entries_user_date_start 索引失败: {str(e)}")

      # 复合索引：按用户ID和日记类型查询（用于统计）
      try:
        conn.exec_driver_sql(
          """
          CREATE INDEX IF NOT EXISTS idx_entries_user_entry_type 
          ON entry (user_id, entry_type)
          """
        )
        logger.debug("创建索引: idx_entries_user_entry_type")
      except Exception as e:
        logger.warning(f"创建 idx_entries_user_entry_type 索引失败: {str(e)}")

      # 为 visited 日记的不重复地点查询创建索引
      try:
        conn.exec_driver_sql(
          """
          CREATE INDEX IF NOT EXISTS idx_entries_visited_location 
          ON entry (user_id, location_name) 
          WHERE entry_type = 'visited'
          """
        )
        logger.debug("创建索引: idx_entries_visited_location")
      except Exception as e:
        logger.warning(f"创建 idx_entries_visited_location 索引失败: {str(e)}")

      # 创建时间单列索引（用于按时间排序查询）
      try:
        conn.exec_driver_sql(
          """
          CREATE INDEX IF NOT EXISTS idx_entries_created_time 
          ON entry (created_time DESC)
          """
        )
        logger.debug("创建索引: idx_entries_created_time")
      except Exception as e:
        logger.warning(f"创建 idx_entries_created_time 索引失败: {str(e)}")

      # ===== 2. Location 表索引 =====

      # 检查 location 表是否存在
      location_exists = conn.exec_driver_sql(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'location')"
      ).scalar()

      if location_exists:
        # 检查 coordinates 字段类型
        try:
          column_type = conn.exec_driver_sql(
            """
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'location' AND column_name = 'coordinates'
            """
          ).scalar()

          logger.info(f"location.coordinates 字段类型: {column_type}")

          # 根据字段类型创建不同的索引
          if column_type == 'json':
            # JSON 类型：创建表达式索引来查询 lat 和 lng
            try:
              conn.exec_driver_sql(
                """
                CREATE INDEX IF NOT EXISTS idx_location_coords_expression 
                ON location (
                    ((coordinates->>'lat')::float),
                    ((coordinates->>'lng')::float)
                )
                """
              )
              logger.info("为 JSON coordinates 创建表达式索引成功")
            except Exception as e:
              logger.warning(f"创建 JSON 表达式索引失败: {str(e)}")

              # 备选方案：创建单独的表达式索引
              try:
                conn.exec_driver_sql(
                  """
                  CREATE INDEX IF NOT EXISTS idx_location_coords_lat 
                  ON location (((coordinates->>'lat')::float))
                  """
                )
                conn.exec_driver_sql(
                  """
                  CREATE INDEX IF NOT EXISTS idx_location_coords_lng 
                  ON location (((coordinates->>'lng')::float))
                  """
                )
                logger.info("创建单独的 lat/lng 表达式索引成功")
              except Exception as e2:
                logger.warning(f"创建单独的表达式索引也失败: {str(e2)}")
          elif column_type == 'jsonb':
            # JSONB 类型：可以创建 GIN 索引
            try:
              conn.exec_driver_sql(
                """
                CREATE INDEX IF NOT EXISTS idx_location_coords_gin 
                ON location USING GIN (coordinates)
                """
              )
              logger.info("为 JSONB coordinates 创建 GIN 索引成功")
            except Exception as e:
              logger.warning(f"创建 JSONB GIN 索引失败: {str(e)}")
          else:
            logger.warning(f"coordinates 字段类型不支持索引: {column_type}")

        except Exception as e:
          logger.warning(f"检查 coordinates 字段类型失败: {str(e)}")

        # 位置名称索引（用于快速查询）
        try:
          conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS idx_location_name 
            ON location (name)
            """
          )
          logger.debug("创建索引: idx_location_name")
        except Exception as e:
          logger.warning(f"创建 idx_location_name 索引失败: {str(e)}")

      # ===== 3. Photo 表索引 =====

      # 检查 photo 表是否存在
      photo_exists = conn.exec_driver_sql(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'photo')"
      ).scalar()

      if photo_exists:
        # 按日记ID查询照片的索引
        try:
          conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS idx_photos_entry_id 
            ON photo (entry_id)
            """
          )
          logger.debug("创建索引: idx_photos_entry_id")
        except Exception as e:
          logger.warning(f"创建 idx_photos_entry_id 索引失败: {str(e)}")

        # 按创建时间查询的索引（可选）
        try:
          conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS idx_photos_created_at 
            ON photo (created_at DESC)
            """
          )
          logger.debug("创建索引: idx_photos_created_at")
        except Exception as e:
          logger.warning(f"创建 idx_photos_created_at 索引失败: {str(e)}")

      # ===== 4. User 表索引 =====

      # 检查 user 表是否存在（注意：user 是 SQL 关键字，表名可能需要引号）
      user_exists = conn.exec_driver_sql(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user')"
      ).scalar()

      if user_exists:
        # 用户名索引（登录验证）
        try:
          conn.exec_driver_sql(
            """
            CREATE INDEX IF NOT EXISTS idx_user_username 
            ON "user" (username)
            """
          )
          logger.debug("创建索引: idx_user_username")
        except Exception as e:
          logger.warning(f"创建 idx_user_username 索引失败: {str(e)}")

        # 邮箱索引已移除，因为email字段已删除
        # try:
        #   conn.exec_driver_sql(
        #     """
        #     CREATE INDEX IF NOT EXISTS idx_user_email
        #     ON "user" (email)
        #     """
        #   )
        #   logger.debug("创建索引: idx_user_email")
        # except Exception as e:
        #   logger.warning(f"创建 idx_user_email 索引失败: {str(e)}")

      conn.commit()

      elapsed_time = time.time() - start_time
      logger.info(f"数据库索引创建完成，耗时: {elapsed_time:.2f}秒")

  except Exception as e:
    logger.error(f"创建数据库索引失败: {str(e)}", exc_info=True)
    # 不要抛出异常，避免应用启动失败
    # 索引创建失败不会影响应用运行，只会影响性能


def check_existing_indexes():
  """
  检查现有索引，用于调试和优化

  Returns:
      list: 现有索引信息
  """
  try:
    with engine.connect() as conn:
      # PostgreSQL 查询现有索引
      result = conn.exec_driver_sql(
        """
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
        """
      ).fetchall()

      logger.info(f"数据库现有索引数量: {len(result)}")
      for row in result:
        logger.debug(f"索引: {row[2]} -> 表: {row[1]}")

      return result

  except Exception as e:
    logger.error(f"检查索引失败: {str(e)}")
    return []


def create_db_and_tables():
  """
  创建数据库表和索引

  注意：在生产环境中，建议将表创建和索引创建分开，
  因为索引创建可能会影响现有数据的性能。
  """
  logger.info("开始创建数据库表和索引...")

  try:
    # 创建表
    logger.info("创建数据库表...")
    SQLModel.metadata.create_all(engine)
    logger.info("数据库表创建完成")

    # 创建索引
    create_indexes()

    # 检查索引状态
    check_existing_indexes()

    logger.info("数据库初始化完成")

  except Exception as e:
    logger.error(f"数据库初始化失败: {str(e)}", exc_info=True)
    raise


def get_session():
  """
  依赖注入函数：每次 API 调用时创建一个新的 Session

  注意：FastAPI 会自动管理 Session 的生命周期，
  确保在每个请求结束时关闭 Session。
  """
  with Session(engine) as session:
    yield session


def test_database_connection():
  """
  测试数据库连接

  Returns:
      bool: 连接是否成功
  """
  try:
    with engine.connect() as conn:
      # 执行简单查询测试连接
      result = conn.exec_driver_sql("SELECT 1").scalar()
      logger.info("数据库连接测试成功")
      return True
  except Exception as e:
    logger.error(f"数据库连接测试失败: {str(e)}")
    return False


def get_database_stats():
  """
  获取数据库统计信息（用于监控）

  Returns:
      dict: 数据库统计信息
  """
  stats = {}
  try:
    with engine.connect() as conn:
      # 获取表记录数
      tables = ["entry", "location", "photo", "user"]
      for table in tables:
        try:
          count = conn.exec_driver_sql(f"SELECT COUNT(*) FROM {table}").scalar()
          stats[f"{table}_count"] = count or 0
        except Exception as e:
          stats[f"{table}_count"] = f"error: {str(e)}"

      # 获取数据库大小
      try:
        db_size = conn.exec_driver_sql(
          "SELECT pg_database_size(current_database())"
        ).scalar()
        stats["database_size_bytes"] = db_size
        stats["database_size_mb"] = db_size / (1024 * 1024)
      except Exception as e:
        stats["database_size"] = f"error: {str(e)}"

      # 获取表大小信息
      try:
        table_sizes = conn.exec_driver_sql(
          """
          SELECT 
              table_name,
              pg_relation_size(quote_ident(table_name)) as size_bytes,
              pg_size_pretty(pg_relation_size(quote_ident(table_name))) as size_pretty
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
          """
        ).fetchall()

        table_size_info = {}
        for row in table_sizes:
          table_size_info[row[0]] = {
            "size_bytes": row[1],
            "size_pretty": row[2]
          }
        stats["table_sizes"] = table_size_info
      except Exception as e:
        stats["table_sizes"] = f"error: {str(e)}"

      return stats

  except Exception as e:
    logger.error(f"获取数据库统计信息失败: {str(e)}")
    return {"error": str(e)}


def optimize_for_json_fields():
  """
  为 JSON 字段优化数据库结构

  建议在生产环境中：
  1. 将 coordinates 字段改为 jsonb 类型（PostgreSQL 支持）
  2. 或者拆分为单独的 latitude 和 longitude 字段

  这个方法展示了如何修改表结构，需要谨慎使用
  """
  logger.warning("注意：这个方法会修改表结构，请谨慎使用")

  try:
    with engine.connect() as conn:
      # 检查 coordinates 字段类型
      column_type = conn.exec_driver_sql(
        """
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'location' AND column_name = 'coordinates'
        """
      ).scalar()

      logger.info(f"location.coordinates 字段类型: {column_type}")

      if column_type == 'json':
        logger.info("建议将 coordinates 字段改为 jsonb 类型以获得更好的索引支持")
        # 这里可以添加修改字段类型的代码
        # 但生产环境需要谨慎操作

  except Exception as e:
    logger.error(f"检查字段类型失败: {str(e)}")
    return False


def check_and_fix_created_time():
  """
  检查并修复 entry 表的 created_time 字段

  如果 entry 表没有 created_time 字段，或者字段有问题，
  这个函数可以添加和修复它。

  Returns:
      bool: 是否成功
  """
  logger.info("检查并修复 entry 表的 created_time 字段...")

  try:
    with engine.connect() as conn:
      # 1. 检查表是否存在
      table_exists = conn.exec_driver_sql(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entry')"
      ).scalar()

      if not table_exists:
        logger.warning("entry 表不存在，跳过修复")
        return False

      # 2. 检查 created_time 字段是否存在
      column_exists = conn.exec_driver_sql(
        """
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'entry' AND column_name = 'created_time'
        )
        """
      ).scalar()

      if not column_exists:
        logger.info("entry 表缺少 created_time 字段，开始添加...")

        # 添加 created_time 字段
        try:
          conn.exec_driver_sql(
            """
            ALTER TABLE entry ADD COLUMN created_time TIMESTAMP WITH TIME ZONE;
            """
          )
          logger.info("成功添加 created_time 字段")
        except Exception as e:
          logger.error(f"添加 created_time 字段失败: {str(e)}")
          return False

      # 3. 检查是否有记录的 created_time 为空，并设置默认值
      null_count = conn.exec_driver_sql(
        "SELECT COUNT(*) FROM entry WHERE created_time IS NULL"
      ).scalar()

      if null_count > 0:
        logger.info(f"发现 {null_count} 条记录的 created_time 为空，设置默认值...")

        try:
          conn.exec_driver_sql(
            """
            UPDATE entry 
            SET created_time = NOW() - INTERVAL '1 day' * RANDOM() * 365
            WHERE created_time IS NULL;
            """
          )
          logger.info("成功为 null 记录设置默认值")
        except Exception as e:
          logger.error(f"设置默认值失败: {str(e)}")

      # 4. 设置非空约束和默认值
      try:
        conn.exec_driver_sql(
          """
          ALTER TABLE entry 
          ALTER COLUMN created_time SET DEFAULT NOW(),
          ALTER COLUMN created_time SET NOT NULL;
          """
        )
        logger.info("成功设置 created_time 字段约束")
      except Exception as e:
        logger.warning(f"设置约束失败，可能已设置: {str(e)}")

      conn.commit()
      logger.info("created_time 字段检查修复完成")
      return True

  except Exception as e:
    logger.error(f"检查修复 created_time 字段失败: {str(e)}")
    return False


def get_table_info():
  """
  获取数据库表的详细信息，包括字段、索引等

  Returns:
      dict: 表结构信息
  """
  table_info = {}

  try:
    with engine.connect() as conn:
      # 获取所有表
      tables = conn.exec_driver_sql(
        """
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
        """
      ).fetchall()

      for table_row in tables:
        table_name = table_row[0]
        info = {"columns": [], "indexes": []}

        # 获取字段信息
        columns = conn.exec_driver_sql(
          f"""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                    """
        ).fetchall()

        for col in columns:
          info["columns"].append({
            "name": col[0],
            "type": col[1],
            "nullable": col[2],
            "default": col[3]
          })

        # 获取索引信息
        indexes = conn.exec_driver_sql(
          f"""
                    SELECT 
                        indexname,
                        indexdef
                    FROM pg_indexes 
                    WHERE tablename = '{table_name}' AND schemaname = 'public'
                    ORDER BY indexname;
                    """
        ).fetchall()

        for idx in indexes:
          info["indexes"].append({
            "name": idx[0],
            "definition": idx[1]
          })

        table_info[table_name] = info

      return table_info

  except Exception as e:
    logger.error(f"获取表信息失败: {str(e)}")
    return {"error": str(e)}


def get_query_performance():
  """
  获取查询性能统计信息

  Returns:
      dict: 查询性能信息
  """
  try:
    with engine.connect() as conn:
      # 获取最慢的查询（需要开启 pg_stat_statements）
      try:
        slow_queries = conn.exec_driver_sql(
          """
          SELECT 
              query,
              calls,
              total_time,
              mean_time,
              rows
          FROM pg_stat_statements 
          ORDER BY mean_time DESC 
          LIMIT 10;
          """
        ).fetchall()

        slow_queries_info = []
        for row in slow_queries:
          slow_queries_info.append({
            "query": row[0][:200] + "..." if len(row[0]) > 200 else row[0],
            "calls": row[1],
            "total_time_ms": row[2],
            "mean_time_ms": row[3],
            "rows": row[4]
          })

        return {"slow_queries": slow_queries_info}

      except Exception as e:
        logger.warning(f"获取慢查询失败（可能未启用 pg_stat_statements）: {str(e)}")
        return {"error": "pg_stat_statements not enabled"}

  except Exception as e:
    logger.error(f"获取查询性能失败: {str(e)}")
    return {"error": str(e)}


def vacuum_and_analyze():
  """
  执行 VACUUM ANALYZE 来优化数据库性能

  注意：在生产环境使用时要谨慎，可能会影响性能
  建议在低峰期执行
  """
  logger.info("开始执行 VACUUM ANALYZE...")

  try:
    with engine.connect() as conn:
      start_time = time.time()

      # VACUUM ANALYZE 更新统计信息
      conn.exec_driver_sql("VACUUM ANALYZE;")
      conn.commit()

      elapsed_time = time.time() - start_time
      logger.info(f"VACUUM ANALYZE 完成，耗时: {elapsed_time:.2f}秒")
      return True

  except Exception as e:
    logger.error(f"执行 VACUUM ANALYZE 失败: {str(e)}")
    return False


def create_database_migration():
  """
  创建数据库迁移文件

  这是一个示例函数，展示如何创建迁移
  实际项目中建议使用 Alembic 等迁移工具
  """
  migration_commands = [
    # 1. 添加 created_time 字段到 entry 表
    """
    ALTER TABLE entry ADD COLUMN IF NOT EXISTS created_time TIMESTAMP WITH TIME ZONE;
    """,

    # 2. 设置默认值
    """
    UPDATE entry SET created_time = NOW() WHERE created_time IS NULL;
    """,

    # 3. 设置约束
    """
    ALTER TABLE entry 
    ALTER COLUMN created_time SET DEFAULT NOW(),
    ALTER COLUMN created_time SET NOT NULL;
    """,

    # 4. 创建索引
    """
    CREATE INDEX IF NOT EXISTS idx_entries_user_created_time 
    ON entry (user_id, created_time DESC);
    """,

    # 5. 创建索引
    """
    CREATE INDEX IF NOT EXISTS idx_entries_created_time 
    ON entry (created_time DESC);
    """
  ]

  logger.info("数据库迁移脚本已生成，请手动执行")
  for i, cmd in enumerate(migration_commands, 1):
    print(f"\n-- 步骤 {i}:")
    print(cmd.strip())

  return migration_commands


def check_json_fields_integrity():
  """
  检查 JSON 字段的数据完整性

  验证 coordinates 字段是否包含必要的 lat 和 lng 键
  """
  logger.info("检查 JSON 字段完整性...")

  try:
    with engine.connect() as conn:
      # 检查 entry 表的 coordinates 字段
      entry_bad_records = conn.exec_driver_sql(
        """
        SELECT id, title, coordinates 
        FROM entry 
        WHERE coordinates IS NULL 
           OR NOT (coordinates ? 'lat' AND coordinates ? 'lng')
           OR coordinates->>'lat' IS NULL 
           OR coordinates->>'lng' IS NULL
        LIMIT 10;
        """
      ).fetchall()

      if entry_bad_records:
        logger.warning(f"发现 {len(entry_bad_records)} 条 entry 记录有坐标问题")
        for record in entry_bad_records:
          logger.warning(f"Entry ID {record[0]}: {record[1]} - 坐标: {record[2]}")

      # 检查 location 表的 coordinates 字段
      location_bad_records = conn.exec_driver_sql(
        """
        SELECT id, name, coordinates 
        FROM location 
        WHERE coordinates IS NULL 
           OR NOT (coordinates ? 'lat' AND coordinates ? 'lng')
           OR coordinates->>'lat' IS NULL 
           OR coordinates->>'lng' IS NULL
        LIMIT 10;
        """
      ).fetchall()

      if location_bad_records:
        logger.warning(f"发现 {len(location_bad_records)} 条 location 记录有坐标问题")
        for record in location_bad_records:
          logger.warning(f"Location ID {record[0]}: {record[1]} - 坐标: {record[2]}")

      return {
        "entry_issues": len(entry_bad_records),
        "location_issues": len(location_bad_records),
        "entry_samples": entry_bad_records,
        "location_samples": location_bad_records
      }

  except Exception as e:
    logger.error(f"检查 JSON 字段完整性失败: {str(e)}")
    return {"error": str(e)}


# ==================== 数据库健康检查 ====================
def health_check():
  """
  数据库健康检查

  Returns:
      dict: 健康状态信息
  """
  health = {
    "status": "unknown",
    "checks": {},
    "timestamp": time.time()
  }

  try:
    # 1. 连接检查
    connection_check = test_database_connection()
    health["checks"]["connection"] = {
      "status": "healthy" if connection_check else "unhealthy",
      "message": "数据库连接正常" if connection_check else "数据库连接失败"
    }

    # 2. 表检查
    if connection_check:
      try:
        table_counts = get_database_stats()
        health["checks"]["tables"] = {
          "status": "healthy",
          "message": "表状态正常",
          "data": table_counts
        }
      except Exception as e:
        health["checks"]["tables"] = {
          "status": "warning",
          "message": f"表检查失败: {str(e)}"
        }

      # 3. 索引检查
      try:
        indexes = check_existing_indexes()
        health["checks"]["indexes"] = {
          "status": "healthy",
          "message": f"发现 {len(indexes)} 个索引",
          "count": len(indexes)
        }
      except Exception as e:
        health["checks"]["indexes"] = {
          "status": "warning",
          "message": f"索引检查失败: {str(e)}"
        }

      # 4. JSON 字段检查
      try:
        json_check = check_json_fields_integrity()
        if json_check.get("entry_issues", 0) == 0 and json_check.get("location_issues", 0) == 0:
          health["checks"]["json_fields"] = {
            "status": "healthy",
            "message": "JSON 字段完整性正常"
          }
        else:
          health["checks"]["json_fields"] = {
            "status": "warning",
            "message": f"JSON 字段存在完整性问题: {json_check.get('entry_issues', 0)} entry, {json_check.get('location_issues', 0)} location",
            "data": json_check
          }
      except Exception as e:
        health["checks"]["json_fields"] = {
          "status": "warning",
          "message": f"JSON 字段检查失败: {str(e)}"
        }

    # 确定总体状态
    unhealthy_count = sum(1 for check in health["checks"].values()
                          if check["status"] in ["unhealthy", "warning"])

    if unhealthy_count == 0:
      health["status"] = "healthy"
    elif health["checks"].get("connection", {}).get("status") == "unhealthy":
      health["status"] = "unhealthy"
    else:
      health["status"] = "warning"

    return health

  except Exception as e:
    logger.error(f"健康检查失败: {str(e)}")
    health["status"] = "unhealthy"
    health["error"] = str(e)
    return health


# ==================== 应用启动初始化 ====================
if __name__ == "__main__":
  """
  直接运行此文件时的测试入口
  """
  logger.info("数据库模块测试启动...")

  # 测试数据库连接
  if test_database_connection():
    logger.info("数据库连接测试通过")

    # 获取数据库信息
    stats = get_database_stats()
    logger.info(f"数据库统计: {stats}")

    # 获取表信息
    table_info = get_table_info()
    logger.info(f"数据库表数量: {len(table_info)}")

    # 检查 created_time 字段
    check_and_fix_created_time()

    # 检查 JSON 字段完整性
    json_status = check_json_fields_integrity()
    logger.info(f"JSON 字段检查结果: {json_status}")

    # 显示表结构
    for table_name, info in table_info.items():
      logger.info(f"表: {table_name}")
      logger.info(f"  字段数: {len(info['columns'])}")
      logger.info(f"  索引数: {len(info['indexes'])}")

      # 显示 JSON 字段详情
      for column in info["columns"]:
        if column["type"] in ["json", "jsonb"]:
          logger.info(f"    JSON 字段: {column['name']} ({column['type']})")

  else:
    logger.error("数据库连接测试失败")
