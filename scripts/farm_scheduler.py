import json
import sys
import math
import random
from typing import List, Dict, Tuple

def load_input_data(input_file: str) -> Dict:
    """加载输入数据"""
    with open(input_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_output_data(output_file: str, data: Dict):
    """保存输出数据"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def calculate_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """计算两点间距离"""
    return math.sqrt((point1[0] - point2[0])**2 + (point1[1] - point2[1])**2)

def generate_field_work_path(field: Dict) -> List[Tuple[float, float]]:
    """为单个田地生成工作路径"""
    x, y = field['x'], field['y']
    width, height = field['width'], field['height']
    
    # 生成田地内的工作路径（往返式作业）
    path = []
    rows = max(3, int(height / 10))  # 根据田地大小确定作业行数
    
    for i in range(rows + 1):
        row_y = y + (height / rows) * i
        if i % 2 == 0:  # 偶数行从左到右
            path.append((x, row_y))
            path.append((x + width, row_y))
        else:  # 奇数行从右到左
            path.append((x + width, row_y))
            path.append((x, row_y))
    
    return path

def optimize_field_assignment(fields: List[Dict], machine_count: int) -> List[List[Dict]]:
    """优化田地分配给农机"""
    if machine_count >= len(fields):
        # 如果农机数量大于等于田地数量，每台农机分配一个田地
        assignments = []
        for i in range(machine_count):
            if i < len(fields):
                assignments.append([fields[i]])
            else:
                assignments.append([])
        return assignments
    
    # 使用贪心算法进行田地分配
    assignments = [[] for _ in range(machine_count)]
    machine_loads = [0.0] * machine_count  # 每台农机的工作负载
    
    # 按田地面积排序（大田地优先分配）
    sorted_fields = sorted(fields, key=lambda f: f['width'] * f['height'], reverse=True)
    
    for field in sorted_fields:
        # 找到当前负载最小的农机
        min_load_machine = min(range(machine_count), key=lambda i: machine_loads[i])
        
        assignments[min_load_machine].append(field)
        machine_loads[min_load_machine] += field['width'] * field['height']
    
    return assignments

def generate_machine_route(machine_id: int, assigned_fields: List[Dict], color: str) -> Dict:
    """为单台农机生成路径"""
    if not assigned_fields:
        return {
            'machineId': machine_id,
            'path': [],
            'color': color
        }
    
    path = []
    
    # 优化田地访问顺序（最近邻算法）
    remaining_fields = assigned_fields.copy()
    current_pos = (0, 0)  # 起始位置
    ordered_fields = []
    
    while remaining_fields:
        # 找到距离当前位置最近的田地
        nearest_field = min(remaining_fields, 
                          key=lambda f: calculate_distance(current_pos, 
                                                         (f['x'] + f['width']/2, f['y'] + f['height']/2)))
        ordered_fields.append(nearest_field)
        remaining_fields.remove(nearest_field)
        current_pos = (nearest_field['x'] + nearest_field['width']/2, 
                      nearest_field['y'] + nearest_field['height']/2)
    
    # 为每个田地生成详细工作路径
    for field in ordered_fields:
        field_path = generate_field_work_path(field)
        
        # 如果不是第一个田地，添加移动到田地的路径
        if path:
            path.append(field_path[0])
        
        path.extend(field_path)
    
    return {
        'machineId': machine_id,
        'path': [{'x': p[0], 'y': p[1]} for p in path],
        'color': color
    }

def calculate_schedule_metrics(machines: List[Dict]) -> Tuple[float, float]:
    """计算调度指标"""
    total_distance = 0
    max_time = 0
    
    colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    
    for machine in machines:
        if len(machine['path']) < 2:
            continue
            
        machine_distance = 0
        for i in range(1, len(machine['path'])):
            prev = machine['path'][i-1]
            curr = machine['path'][i]
            machine_distance += calculate_distance((prev['x'], prev['y']), (curr['x'], curr['y']))
        
        total_distance += machine_distance
        
        # 假设农机平均速度为5 m/s
        machine_time = machine_distance / 5 / 3600  # 转换为小时
        max_time = max(max_time, machine_time)
    
    # 效率计算：基于负载均衡和总距离
    avg_distance = total_distance / len(machines) if machines else 0
    distance_variance = sum((sum(calculate_distance((p1['x'], p1['y']), (p2['x'], p2['y'])) 
                                for p1, p2 in zip(m['path'][:-1], m['path'][1:])) - avg_distance)**2 
                           for m in machines if len(m['path']) > 1)
    distance_variance = distance_variance / len(machines) if machines else 0
    
    efficiency = max(0.6, min(0.95, 1 - (distance_variance / (avg_distance**2 + 1)) * 0.3))
    
    return max_time, efficiency

def farm_scheduling_algorithm(data: Dict) -> Dict:
    """主要的农机调度算法"""
    machine_count = data['machineCount']
    fields = data['fields']
    
    if not fields:
        return {
            'machines': [],
            'totalTime': 0,
            'efficiency': 0
        }
    
    # 优化田地分配
    field_assignments = optimize_field_assignment(fields, machine_count)
    
    # 为每台农机生成路径
    colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
    machines = []
    
    for i, assigned_fields in enumerate(field_assignments):
        if assigned_fields:  # 只为有分配田地的农机生成路径
            machine_route = generate_machine_route(
                i + 1, 
                assigned_fields, 
                colors[i % len(colors)]
            )
            machines.append(machine_route)
    
    # 计算调度指标
    total_time, efficiency = calculate_schedule_metrics(machines)
    
    return {
        'machines': machines,
        'totalTime': total_time,
        'efficiency': efficiency
    }

def main():
    """主函数"""
    if len(sys.argv) != 3:
        print("使用方法: python farm_scheduler.py <input_file> <output_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        # 加载输入数据
        input_data = load_input_data(input_file)
        
        # 执行调度算法
        result = farm_scheduling_algorithm(input_data)
        
        # 保存结果
        save_output_data(output_file, result)
        
        print(f"调度计算完成，结果已保存到 {output_file}")
        
    except Exception as e:
        print(f"错误: {e}")
        # 保存错误信息
        error_result = {
            'machines': [],
            'totalTime': 0,
            'efficiency': 0,
            'error': str(e)
        }
        save_output_data(output_file, error_result)
        sys.exit(1)

if __name__ == "__main__":
    main()
